import { extractSpreadsheetId, getErrorStatus } from "./functions";
import { IDataAdapter, Resource } from "./interfaces";
import { HttpFilter } from "../core/common";
import { ILogger, ServletRequest, ICache, ServletResponse, HttpStatusCode } from "../core/interfaces";

export class ResourceHandler extends HttpFilter {
    private logger: ILogger;
    private adapter: IDataAdapter;
    private resources: Resource[];

    constructor({ ILogger, IDataAdapter }: any) {
        super();
        this.logger = ILogger;
        this.adapter = IDataAdapter;
    }

    init(param?: Record<string, any>): void {
        super.init(param);
        let { resources } = this.param;
        this.adapter.init({ name: resources });
        this.resources = this.adapter.select();
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
        let rec: Resource = this.resources.filter(r => r.name.toLowerCase() === resource.toLowerCase())[0];
        if (rec) {
            // Store the old value in _prop_ format
            routeParam['_resource_'] = resource;
            routeParam.resource = rec.sheet;
            routeParam.spreadsheetId = extractSpreadsheetId(rec.url);
            routeParam.resourceLimit = rec.limit;
        }
        else {
            res.json(getErrorStatus(HttpStatusCode.NOT_FOUND)).end();
        }
    }
}