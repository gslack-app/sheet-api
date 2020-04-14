
import { IDataAdapter, Schema } from "./interfaces";
import { doQuery, getStatusObject, transform, evalExp, email, required, url, blank } from "./functions";
import { ILogger, ServletRequest, ServletResponse, NotFoundHandler, HttpStatusCode } from "../core/interfaces";
import { HttpServlet } from "../core/servlet";
import { json } from "../core/common";
import { error, object, array, string, number, boolean, date, regexp, Null, Undefined, empty, regex, not, any, and, or, optional, is, oneOf, like, objectOf, arrayOf } from 'f-validator';

export class ApiServlet extends HttpServlet {
    protected readonly MaxPageSize: number = 100;
    protected readonly DefaultPageSize: number = 20;
    protected logger: ILogger;
    protected adapter: IDataAdapter;
    protected schemas: Schema[];

    constructor({ ILogger, IDataAdapter }: any) {
        super();
        this.logger = ILogger;
        this.adapter = IDataAdapter;
    }

    init(param?: Record<string, any>, context?: Record<string, any>): void {
        super.init(param, context);
        let { schemas } = this.param;
        this.adapter.init({ name: schemas });
        this.schemas = this.schemas = this.adapter.select();
    }

    async doGet(req: ServletRequest, res: ServletResponse): Promise<void> {
        let { resource, id, spreadsheetId, _resource_ } = req.var['_get_'];
        let query: string = req.param.query;
        let offset: number = id || req.param.offset || 1;
        let limit: number = id ? 1 : req.param.limit;
        // Convert to number
        offset *= 1;
        limit *= 1;
        limit = limit ? (limit > this.MaxPageSize ? this.MaxPageSize : limit) : this.DefaultPageSize;
        this.adapter.init({ name: resource, id: spreadsheetId });
        let columns = this.adapter.getColumns();
        let recSchemas = this.getSchemas(_resource_);
        this.adapter.setExcludedColumns(this.getExcludedColumns(recSchemas, columns))
        let allRows = this.adapter.select();
        let results: any[] = allRows;
        let sObj: any;

        try {
            if (query) {
                this.logger.debug(`Orginal query: ${query}`);
                query = this.transformQuery(recSchemas, query);
                this.logger.debug(`Modified query: ${query}`);
                results = doQuery(query, allRows);
            }

            let subset = results.slice(offset - 1, offset - 1 + limit);
            res.json({
                total: id ? subset.length : (query ? results.length : this.adapter.getTotal()),
                offset: id ? 1 : offset,
                limit: id ? 1 : limit,
                results: this.transformToREST(recSchemas, columns, subset)
            }, HttpStatusCode.OK).end();
        }
        catch (e) {
            this.logger && this.logger.error(`ApiServlet -> ${e.stack}`);
            sObj = getStatusObject(HttpStatusCode.INTERNAL_SERVER_ERROR);
            sObj.detail = e.message;
            res.json(sObj, HttpStatusCode.INTERNAL_SERVER_ERROR).end();
        }
    }

    async doPost(req: ServletRequest, res: ServletResponse): Promise<void> {
        let { action, resource, id, spreadsheetId, _resource_ } = req.var['_post_'];
        let target: any = req.postData || null;
        let source: any;
        let sObj: any;
        let columns = this.adapter.getColumns();
        action = action ? action.toLowerCase() : '';
        this.adapter.init({ name: resource, id: spreadsheetId });

        if (id) {
            if (id > this.adapter.getTotal()) {
                res.json(getStatusObject(HttpStatusCode.NOT_FOUND)).end();
                return;
            }
            source = this.adapter.select(id, 1)[0];
        }

        try {
            // Validate post data
            if (['create', 'update'].includes(action)) {
                sObj = getStatusObject(HttpStatusCode.BAD_REQUEST);
                if (target) {
                    let recSchemas = this.getSchemas(_resource_);
                    let error = this.validate(recSchemas, target);
                    if (error) {
                        sObj.detail = error;
                        res.json(sObj, HttpStatusCode.BAD_REQUEST).end();
                        return;
                    }

                    // Transform data                    
                    sObj = getStatusObject(HttpStatusCode.OK);
                    target = this.transformFromREST(recSchemas, target)[0];
                    switch (action) {
                        case 'create':
                            let rec = this.adapter.insert(target);
                            sObj.results = this.transformToREST(recSchemas, columns, [rec]);
                            break;
                        case 'update':
                            Object.assign(source, target);
                            this.adapter.update(source);
                            sObj.results = this.transformToREST(recSchemas, columns, [source]);
                            break;
                    }
                }
                else {
                    res.json(sObj, HttpStatusCode.BAD_REQUEST).end();
                    return;
                }
            } else {
                sObj = getStatusObject(HttpStatusCode.OK);
                this.adapter.delete(source[this.adapter.getSysId()]);
                sObj.results = [source];
            }
            res.json(sObj, HttpStatusCode.OK).end();
        }
        catch (e) {
            this.logger && this.logger.error(`ApiServlet -> ${e.stack}`);
            sObj = getStatusObject(HttpStatusCode.INTERNAL_SERVER_ERROR);
            sObj.detail = e.message;
            res.json(sObj, HttpStatusCode.INTERNAL_SERVER_ERROR).end();
        }
    }

    protected validate(recs: Schema[], data: any): any {
        let args = this.getValidators();
        let errors: string[] = [];
        let fields = recs.filter(rec => rec.validation);
        fields.forEach(rec => {
            // Avoid variable name duplicates with validator name
            args[`_${rec.alias}`] = data[rec.alias];
            let res = evalExp(`${rec.validation}(_${rec.alias}, ['${rec.alias}'])`, args);
            if (res)
                errors.push(`Field: ${rec.alias}. Expected: ${res.expected}. Received: ${JSON.stringify(res.received)}`);
        });
        return errors.length ? errors : null;
    }

    protected getValidators(): any {
        let names = ['error', 'object', 'array', 'string', 'number',
            'boolean', 'date', 'regexp', 'Null', 'Undefined',
            'empty', 'regex', 'not', 'any', 'and',
            'or', 'optional', 'is', 'oneOf', 'like',
            'objectOf', 'arrayOf',
            // Additional validators
            'required', 'email', 'url', 'blank'
        ];
        let funcs = [error, object, array, string, number,
            boolean, date, regexp, Null, Undefined,
            empty, regex, not, any, and,
            or, optional, is, oneOf, like,
            objectOf, arrayOf,
            // Additional validators
            required, email, url, blank
        ];
        let validators: any = {};
        for (let i = 0, len = names.length; i < len; i++) {
            validators[names[i]] = funcs[i];
        }
        return validators;
    }

    protected getSchemas(resource: string): Schema[] {
        return doQuery(`[*resource=${resource}]`, this.schemas);
    }

    protected getExcludedColumns(recs: Schema[], columns: string[]): string[] {
        if (recs.length) {
            let target = recs.map(r => r.column);
            return columns.filter(col => !target.includes(col));
        }
        return [];
    }

    protected transformQuery(recs: Schema[], query: string): string {
        if (recs.length)
            recs.forEach(rec => query = query.replace(rec.alias, rec.column));
        return query;
    }

    protected transformToREST(recs: Schema[], columns: string[], objects: any): any {
        if (recs.length) {
            let addProps: any = {};
            let transformProps: any = {};
            let renameProps: any = {};
            let removeProps = this.getExcludedColumns(recs, columns);

            for (let i = 0, len = recs.length; i < len; i++) {
                let schema = recs[i];
                if (schema.primary)
                    addProps['_id_'] = (r) => r[schema.column];
                renameProps[schema.column] = schema.alias;
                if (schema.format) {
                    transformProps[schema.column] = (r) => {
                        let value = r[schema.column] || schema.default;
                        try {
                            return this.isDate(value)
                                ? Utilities.formatDate(new Date(value), Session.getScriptTimeZone(), schema.format)
                                : Utilities.formatString(schema.format, value);
                        }
                        catch {
                            return value;
                        }
                    };
                }
            }
            return transform(objects, {
                add: addProps,
                transform: transformProps,
                rename: renameProps,
                remove: removeProps
            });
        }
        return objects;
    }

    protected transformFromREST(recs: Schema[], objects: any): any {
        if (recs.length) {
            let transformProps: any = {};
            let renameProps: any = {};

            for (let i = 0, len = recs.length; i < len; i++) {
                let schema = recs[i];
                renameProps[schema.alias] = schema.column;
                transformProps[schema.alias] = (r) => {
                    let value: any = r[schema.alias] || schema.default;
                    switch (schema.type) {
                        case 'boolean':
                            value = Boolean(value);
                            break;
                        case 'date':
                            value = Date.parse(value);
                            break;
                        case 'number':
                            value = Number(value);
                            break;
                        default:
                            value = String(value);
                            break;
                    }
                    return value;
                };
            }
            return transform(objects, {
                transform: transformProps,
                rename: renameProps
            });
        }
        return objects;
    }

    protected isDate(date: any): boolean {
        if (date) {
            if (typeof date === 'object')
                return date.constructor === Date;
            const regex = /([0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]+)?(Z)?/;
            return regex.test(date);
        }
        return false;
    }
}

export class ApiNotFoundHandler implements NotFoundHandler {
    doGet(): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
        return json(getStatusObject(HttpStatusCode.NOT_FOUND));
    }

    doPost(): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
        return json(getStatusObject(HttpStatusCode.NOT_FOUND));
    }
}
