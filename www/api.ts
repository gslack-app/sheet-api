
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
    protected cacheSvc: ICache;
    protected schemas: Schema[];

    constructor({ ICache, ILogger, IDataAdapter }: any) {
        super();
        this.cacheSvc = ICache;
        this.logger = ILogger;
        this.adapter = IDataAdapter;
    }

    init(param?: Record<string, any>, context?: Record<string, any>): void {
        super.init(param, context);
        let { schemas } = this.param;
        this.adapter.init({ name: schemas });
        let schemasCacheId = this.adapter.getSessionId();
        this.schemas = this.cacheSvc.get(schemasCacheId);
        if (!this.schemas) {
            this.schemas = this.adapter.select();
            this.cacheSvc.set(schemasCacheId, this.schemas);
        }
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
        let cacheId = this.adapter.getSessionId();
        let data = this.cacheSvc.get(cacheId);

        if (!data) {
            // Select all data & put into cache
            data = this.transformToREST(_resource_, this.adapter.getColumns(), this.adapter.select());
            this.cacheSvc.set(cacheId, data);
        }

        let results: any[] = data;
        if (query)
            results = doQuery(query, data);
        let subset = results.slice(offset - 1, offset - 1 + limit);
        // Data transform
        res.json({
            total: id ? subset.length : (query ? results.length : this.adapter.getTotal()),
            offset: id ? 1 : offset,
            limit: id ? 1 : limit,
            results: subset
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
            this.logger.error(e);
            res.json(getStatusObject(HttpStatusCode.INTERNAL_SERVER_ERROR)).end();
        }
        finally {
            let cacheId = this.adapter.getSessionId();
            this.cacheSvc.remove(cacheId);
        }
    }

    protected transformToREST(resource: string, columns: string[], objects: any[]): any {
        let recs: Schema[] = doQuery(`[*resource=${resource}]`, this.schemas);
        let i = 0;
        if (recs.length) {
            let addProps: any = {};
            let transformProps: any = {};
            let renameProps: any = {};
            let target = recs.map(r => r.column);
            let removeProps = columns.filter(col => !target.includes(col));

            for (const schema of recs) {
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
