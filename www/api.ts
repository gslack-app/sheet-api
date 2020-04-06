import { ILogger, ServletRequest, ServletResponse, NotFoundHandler, ICache, HttpStatusCode } from "../core/interfaces";
import { HttpServlet } from "../core/servlet";
import { json } from "../core/common";
import { IDataAdapter, jsonQuery } from "./interfaces";

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
        let table: string = req.var['_get_'].resource;
        let id: number = req.var['_get_'].id;
        let query: string = req.param.query;
        let offset: number = id || req.param.offset || 1;
        let limit: number = id ? 1 : req.param.limit;
        // Convert to number
        offset *= 1;
        limit *= 1;
        limit = limit ? (limit > this.MaxPageSize ? this.MaxPageSize : limit) : this.DefaultPageSize;
        this.adapter.init({ name: table });
        let cacheId = this.adapter.getSessionId();
        let data = this.cacheSvc.get(cacheId);

        if (!data) {
            // Select all data & put into cache
            data = this.adapter.select();
            this.cacheSvc.set(cacheId, data);
        }

        let results: any[] = data;
        if (query)
            results = jsonQuery(query,
                {
                    data: data,
                    force: [],
                    locals: this.getLocalHelpers(),
                    allowRegexp: true
                }).value;
        let subset = results.slice(offset - 1, offset - 1 + limit);
        res.json({
            total: id ? subset.length : (query ? results.length : this.adapter.getTotal()),
            offset: id ? 1 : offset,
            limit: id ? 1 : limit,
            results: subset
        }, HttpStatusCode.OK).end();
    }

    async doPost(req: ServletRequest, res: ServletResponse): Promise<void> {
    }

    protected getLocalHelpers(): any {
        return {
            left: (str: string, len: number) => str.substr(0, len),
            right: (str: string, len: number) => str.substr(str.length - len, str.length),
            like: (str: string, sub: string) => str.indexOf(sub) >= 0,
            notLike: (str: string, sub: string) => str.indexOf(sub) < 0,
            empty: (str: string) => str ? str.trim().length == 0 : true,
            notEmpty: (str: string) => str ? str.trim().length > 0 : false
        }
    }
}

export class ApiNotFoundHandler implements NotFoundHandler {
    private notFound = {
        type: '/error',
        status: 404,
        title: 'The requested resource does not exist'
    };

    doGet(): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
        return json(this.notFound);
    }

    doPost(): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
        return json(this.notFound);
    }
}