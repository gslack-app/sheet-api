import { IDataAdapter, Schema, IQueryAdapter } from "./interfaces";
import { doQuery, getStatusObject, transform, evalExp, email, required, url, blank } from "./functions";
import { ILogger, ServletRequest, ServletResponse, NotFoundHandler, HttpStatusCode } from "../core/interfaces";
import { HttpServlet } from "../core/servlet";
import { json } from "../core/common";
import { error, object, array, string, number, boolean, date, regexp, Null, Undefined, empty, regex, not, any, and, or, optional, is, oneOf, like, objectOf, arrayOf } from 'f-validator';

export class ApiServlet extends HttpServlet {
    protected readonly MaxPageSize: number = 100;
    protected readonly DefaultPageSize: number = 20;
    protected queryAdapter: IQueryAdapter;
    protected logger: ILogger;
    protected dataAdapter: IDataAdapter;
    protected schemas: Schema[];
    protected queryOption: 'no_format' | 'no_values';

    constructor({ ILogger, IQueryAdapter, IDataAdapter }: any) {
        super();
        this.logger = ILogger;
        this.queryAdapter = IQueryAdapter;
        this.dataAdapter = IDataAdapter;
    }

    init(param?: Record<string, any>, context?: Record<string, any>): void {
        super.init(param, context);
        let { schemas, noFormat } = this.param;
        this.queryOption = noFormat ? 'no_format' : 'no_values';
        this.dataAdapter.init({ name: schemas });
        this.schemas = this.schemas = this.dataAdapter.select();
    }

    async doGet(req: ServletRequest, res: ServletResponse): Promise<void> {
        let { resource, id, spreadsheetId, _resource_ } = req.var['_get_'];
        let offset: number = id ? 1 : req.param.offset || 1;
        let limit: number = id ? 1 : req.param.limit || this.DefaultPageSize;
        // Convert to number
        offset *= 0;
        limit *= 1;
        limit = limit > this.MaxPageSize ? this.MaxPageSize : limit;
        let schemas = this.getSchemas(_resource_);
        let restStatus: any;

        try {
            this.queryAdapter.init({ name: resource, id: spreadsheetId });
            this.queryAdapter.setFormat(this.queryOption == 'no_format' ? 'json' : 'csv');
            let columns: string[];
            let labels: string[];
            let formats: string[];

            if (schemas.length) {
                columns = schemas.map(s => this.queryAdapter.getIdByColumn(s.column));
                labels = schemas.map(s => `${this.queryAdapter.getIdByColumn(s.column)} '${s.alias}'`);
                formats = schemas.map(s => s.format ? `${this.queryAdapter.getIdByColumn(s.column)} '${s.format}'` : null).filter(f => f);
            }
            else {
                columns = this.queryAdapter.getIds();
                labels = columns.map(c => `${c} '${this.queryAdapter.getColumnById(c)}'`);
                formats = [];
            }
            // where
            // order by
            let selectPart = `select ${columns.join()}`;
            let limitPart = `limit ${limit}`;
            let offsetPart = `offset ${offset}`;
            let labelPart = `label ${labels.join()}`;
            let formatPart = formats.length ? `format ${formats.filter(f => f).join()}` : '';
            let optionsPart = `options ${this.queryOption}`;
            let query = [selectPart, limitPart, offsetPart, labelPart, formatPart, optionsPart].join(' ');
            this.logger.debug(query);
            let results = this.queryAdapter.query(query);
            res.json(results, HttpStatusCode.OK).end();
        }
        catch (e) {
            this.logger && this.logger.error(`ApiServlet -> ${e.stack}`);
            restStatus = getStatusObject(HttpStatusCode.INTERNAL_SERVER_ERROR);
            restStatus.detail = e.message;
            res.json(restStatus, HttpStatusCode.INTERNAL_SERVER_ERROR).end();
        }
    }

    async doPost(req: ServletRequest, res: ServletResponse): Promise<void> {
        let { action, resource, id, spreadsheetId, _resource_ } = req.var['_post_'];
        let objects: any = req.postData || null;
        let batch: string = req.param.batch;
        action = action ? action.toLowerCase() : '';
        let restStatus: any;

        try {
            // Support only single primary key        
            let schemas = this.getSchemas(_resource_);
            let pkCol = schemas.filter(rec => rec.primary)[0];
            this.dataAdapter.init({ name: resource, id: spreadsheetId });
            if (pkCol) {
                this.dataAdapter.setKeyColumn(pkCol.column);
                this.dataAdapter.setKeyType(pkCol.primary as any);
            }
            // Validate post data
            restStatus = getStatusObject(HttpStatusCode.BAD_REQUEST);
            let should = (batch && action !== 'delete') || ['create', 'update'].includes(action);
            if (should && !objects) {
                res.json(restStatus, HttpStatusCode.BAD_REQUEST).end();
                return;
            }

            let error = should ? this.validate(schemas, objects) : null;
            if (error) {
                restStatus.detail = error;
                res.json(restStatus, HttpStatusCode.BAD_REQUEST).end();
                return;
            }

            // Transform data                 
            objects = should ? this.transformFromREST(schemas, objects) : objects;
            restStatus = batch
                ? this.processPostBatch(action, objects, schemas)
                : this.processPost(action, id, objects ? objects[0] : null, schemas);
            res.json(restStatus, HttpStatusCode.OK).end();
        }
        catch (e) {
            this.logger && this.logger.error(`ApiServlet -> ${e.stack}`);
            restStatus = getStatusObject(HttpStatusCode.INTERNAL_SERVER_ERROR);
            restStatus.detail = e.message;
            res.json(restStatus, HttpStatusCode.INTERNAL_SERVER_ERROR).end();
        }
    }

    protected processPost(action: string, id: any, objects: any, schemas: Schema[]): any {
        let status = getStatusObject(HttpStatusCode.OK);
        let columns = this.dataAdapter.getColumns();
        if (action == 'create') {
            let rec = this.dataAdapter.insert(objects);
            status.results = this.transformToREST(schemas, columns, [rec]);
        }
        else {
            let recs = this.dataAdapter.selectByKey(id);
            if (recs.length === 0)
                return getStatusObject(HttpStatusCode.NOT_FOUND);
            let source = recs[0];
            switch (action) {
                case 'update':
                    Object.assign(source, objects);
                    this.dataAdapter.update(source);
                    status.results = this.transformToREST(schemas, columns, [source]);
                    break;
                case 'delete':
                    this.dataAdapter.delete(source[this.dataAdapter.getSysId()]);
                    status.results = this.transformToREST(schemas, columns, [source]);
                    break;
            }

        }
        return status;
    }

    protected processPostBatch(action: string, objects: any, schemas: Schema[]): void {
        let status = getStatusObject(HttpStatusCode.OK);
        let columns = this.dataAdapter.getColumns();
        if (action == 'create') {
            let rec = this.dataAdapter.insertBatch(objects);
            status.results = this.transformToREST(schemas, columns, rec);
        }
        else {
            let notFoundRecs: any[] = [];
            let source = objects.map(item => {
                let recs = this.dataAdapter.selectByKey(item);
                if (recs.length === 0)
                    notFoundRecs.push(item);
                else
                    return recs[0];
            });
            if (notFoundRecs.length) {
                status = getStatusObject(HttpStatusCode.NOT_FOUND);
                status.detail = notFoundRecs;
                return status;
            }

            switch (action) {
                case 'update':
                    for (let i = 0, len = source.length; i < len; i++) {
                        Object.assign(source[i], objects[i]);
                    }
                    this.dataAdapter.updateBatch(source);
                    status.results = this.transformToREST(schemas, columns, source);
                    break;
                case 'delete':
                    this.dataAdapter.deleteBatch(source);
                    status.results = this.transformToREST(schemas, columns, source);
                    break;
            }
        }
        return status;
    }

    protected validate(recs: Schema[], data: any): any {
        let args = this.getValidators();
        let errors: string[] = [];
        let fields = recs.filter(rec => rec.validation);
        let items = Array.isArray(data) ? data : [data];
        items.forEach(item => {
            fields.forEach(rec => {
                // Avoid variable name duplicates with validator name
                args[`_${rec.alias}`] = item[rec.alias];
                let res = evalExp(`${rec.validation}(_${rec.alias}, ['${rec.alias}'])`, args);
                if (res)
                    errors.push(`Field: ${rec.alias}. Expected: ${res.expected}. Received: ${JSON.stringify(res.received)}`);
            });
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
