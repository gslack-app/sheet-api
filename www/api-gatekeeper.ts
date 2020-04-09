import { getStatusObject } from "./api";
import { IDataAdapter, Identity, Rule, jsonQuery } from "./interfaces";
import { HttpFilter } from "../core/common";
import { ILogger, ServletRequest, ServletResponse, ICache, HttpStatusCode } from "../core/interfaces";

export class ApiGatekeeper extends HttpFilter {
    private logger: ILogger;
    private adapter: IDataAdapter;
    private cacheSvc: ICache;
    private identities: Identity[];
    private rules: Rule[];

    constructor({ ICache, ILogger, IDataAdapter }: any) {
        super();
        this.cacheSvc = ICache;
        this.logger = ILogger;
        this.adapter = IDataAdapter;
    }

    init(param?: Record<string, any>): void {
        super.init(param);
        let { authentication, authorization, spreadsheetId } = this.param;
        this.adapter.init({ name: authentication, id: spreadsheetId });
        let identityCacheId = this.adapter.getSessionId();
        this.identities = this.cacheSvc.get(identityCacheId);
        if (!this.identities) {
            this.identities = this.adapter.select();
            this.cacheSvc.set(identityCacheId, this.identities)
        }

        this.adapter.init({ name: authorization, id: spreadsheetId });
        let ruleCacheId = this.adapter.getSessionId();
        this.rules = this.cacheSvc.get(ruleCacheId);
        if (!this.rules) {
            this.rules = this.adapter.select();
            this.cacheSvc.set(ruleCacheId, this.rules)
        }
    }

    doFilter(request: ServletRequest, response: ServletResponse): void {
        let { token } = request.param;
        if (!this.isTokenValid(token)) {
            this.logger.info(`Token ${token} is invalid`);
            response.json(getStatusObject(HttpStatusCode.UNAUTHORIZED)).end();
            return;
        }
    }

    private isTokenValid(token: string): boolean {
        if (token) {
            let recs = jsonQuery(`[*token=${token}]`, {
                data: this.identities,
                force: []
            }).value as any[];
            return recs.length > 0;
        }
        return false;
    }
}