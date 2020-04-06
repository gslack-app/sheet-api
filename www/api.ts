import { ILogger, ServletRequest, ServletResponse, NotFoundHandler, ICache, HttpStatusCode } from "../core/interfaces";
import { HttpServlet } from "../core/servlet";
import { json } from "../core/common";
import { IDataAdapter } from "./interfaces";

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
        let id: string = req.var['_get_'].id;        
        let offset: number = id || req.param.offset || 1;
        let limit: number = id ? 1 : req.param.limit;
        limit = limit ? (limit > this.MaxPageSize ? this.MaxPageSize : limit) : this.DefaultPageSize;
        this.adapter.init({ name: table });
        let cacheId = this.adapter.getSessionId(offset, limit);
        let data = this.cacheSvc.get(cacheId);

        if (!data) {
            data = this.adapter.select(offset, limit);
            this.cacheSvc.set(cacheId, data);
        }

        res.json({
            total: this.adapter.getTotal(),
            offset: offset,
            limit: limit,
            results: data
        }, HttpStatusCode.OK).end();
    }

    async doPost(req: ServletRequest, res: ServletResponse): Promise<void> {
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