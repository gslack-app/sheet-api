import { IDataAdapter, Resource } from "./interfaces";
import { HttpFilter } from "../core/common";
import { ILogger, ServletRequest, ICache, ServletResponse } from "../core/interfaces";
import { doQuery, extractSpreadsheetId } from "./functions";

export class ResourceHandler extends HttpFilter {
    private cacheSvc: ICache;
    private logger: ILogger;
    private adapter: IDataAdapter;
    private resources: Resource[];

    constructor({ ICache, ILogger, IDataAdapter }: any) {
        super()
        this.cacheSvc = ICache;
        this.logger = ILogger;
        this.adapter = IDataAdapter;
    }

    init(param?: Record<string, any>): void {
        super.init(param);
        let { resources } = this.param;
        this.adapter.init({ name: resources });
        let resourceCacheId = this.adapter.getSessionId();
        this.resources = this.cacheSvc.get(resourceCacheId);
        if (!this.resources) {
            this.resources = this.adapter.select();
            this.cacheSvc.set(resourceCacheId, this.resources)
        }
    }

    beforeGet(req: ServletRequest, res: ServletResponse): void {
        this.processRequest(req, res);
    }

    beforePost(req: ServletRequest, res: ServletResponse): void {
        this.processRequest(req, res);
    }

    private processRequest(req: ServletRequest, res: ServletResponse): void {
        // Mapping resource to persistent layer
        let routeParam = req.var['_get_'] || req.var['_post_'];
        let { resource } = routeParam;
        let rec: Resource = doQuery(`[*name:eq(${resource})]`, this.resources)[0];
        if (rec) {
            routeParam.resource = rec.sheet;
            routeParam.spreadsheetId = extractSpreadsheetId(rec.url);
        }
    }
}