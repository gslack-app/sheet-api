
import { IDataAdapter, Schema } from "./interfaces";
import { doQuery, getStatusObject, transform } from "./functions";
import { ILogger, ServletRequest, ServletResponse, NotFoundHandler, ICache, HttpStatusCode } from "../core/interfaces";
import { HttpServlet } from "../core/servlet";
import { json } from "../core/common";

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

    async doPost(req: ServletRequest, res: ServletResponse): Promise<void> {
        let { action, resource, id, spreadsheetId } = req.var['_post_'];
        let content: string = req.postData;
        let target: any = content || null;
        let source: any;
        this.adapter.init({ name: resource, id: spreadsheetId });

        if (id) {
            if (id > this.adapter.getTotal()) {
                res.json(getStatusObject(HttpStatusCode.NOT_FOUND)).end();
                return;
            }
            source = this.adapter.select(id, 1)[0];
        }

        try {
            let obj = getStatusObject(HttpStatusCode.OK);
            switch (action.toLowerCase()) {
                case 'create':
                    let rec = this.adapter.insert(target);
                    obj.results = [rec];
                    break;
                case 'update':
                    Object.assign(source, target);
                    this.adapter.update(source);
                    obj.results = [source];
                    break;
                case 'delete':
                    this.adapter.delete(source[this.adapter.getSysId()]);
                    obj.results = [source];
                    break;
            }
            res.json(obj, HttpStatusCode.OK).end();
        }
        catch (e) {
            this.logger && this.logger.error(`ApiServlet -> ${e.stack}`);
            res.json(getStatusObject(HttpStatusCode.INTERNAL_SERVER_ERROR)).end();
        }
    }

    protected getSchemas(resource: string): Schema[] {
        return doQuery(`[*resource=${resource}]`, this.schemas);
    }

    protected getExcludedColumns(recs: Schema[], columns: string[]): string[] {
        let target = recs.map(r => r.column);
        return columns.filter(col => !target.includes(col));
    }

    protected transformQuery(recs: Schema[], query: string): string {
        if (recs.length)
            recs.forEach(rec => query = query.replace(rec.alias, rec.column));
        return query;
    }

    protected transformToREST(recs: Schema[], columns: string[], objects: any[]): any {
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
