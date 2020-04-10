
import { IDataAdapter } from "./interfaces";
import { doQuery, getStatusObject } from "./functions";
import { ILogger, ServletRequest, ServletResponse, NotFoundHandler, ICache, HttpStatusCode } from "../core/interfaces";
import { HttpServlet } from "../core/servlet";
import { json } from "../core/common";

export class ApiServlet extends HttpServlet {
    protected readonly MaxPageSize: number = 100;
    protected readonly DefaultPageSize: number = 20;
    protected logger: ILogger;
    protected adapter: IDataAdapter;
    protected cacheSvc: ICache;

    constructor({ ICache, ILogger, IDataAdapter }: any) {
        super();
        this.cacheSvc = ICache;
        this.logger = ILogger;
        this.adapter = IDataAdapter;
    }

    async doGet(req: ServletRequest, res: ServletResponse): Promise<void> {
        let { resource, id, spreadsheetId } = req.var['_get_'];
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
            data = this.adapter.select();
            this.cacheSvc.set(cacheId, data);
        }

        let results: any[] = data;
        if (query)
            results = doQuery(query, data);
        let subset = results.slice(offset - 1, offset - 1 + limit);
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
}

export class ApiNotFoundHandler implements NotFoundHandler {
    doGet(): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
        return json(getStatusObject(HttpStatusCode.NOT_FOUND));
    }

    doPost(): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
        return json(getStatusObject(HttpStatusCode.NOT_FOUND));
    }
}
