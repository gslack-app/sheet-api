import { IDataAdapter, Identity, Rule, IACLService } from "./interfaces";
import { getErrorStatus } from "./functions";
import { HttpFilter } from "../core/common";
import { ILogger, ServletRequest, ServletResponse, HttpStatusCode } from "../core/interfaces";
import { ACLService } from '@techteamer/acl';

export class ApiGatekeeper extends HttpFilter {
    private logger: ILogger;
    private adapter: IDataAdapter;
    private identities: any[];
    private rules: Rule[];
    private aclSvc: IACLService;
    private defaultRole: string;

    constructor({ ILogger, IDataAdapter }: any) {
        super();
        this.logger = ILogger;
        this.adapter = IDataAdapter;
    }

    init(param?: Record<string, any>): void {
        super.init(param);
        let { authentication, authorization, defaultRole } = this.param;
        this.defaultRole = defaultRole ? defaultRole.trim().toLowerCase() : null;

        this.adapter.init({ name: authentication });
        this.identities = this.adapter.select();

        this.adapter.init({ name: authorization });
        this.rules = this.adapter.select();

        this.aclSvc = new ACLService();
        let allRoles = this.rules.map(r => r.roles as any).join();
        // Get distinct roles
        let uniqueRoles = allRoles.split(',')
            .map(r => r.trim().toLowerCase())
            .filter((value, index, self) => self.indexOf(value) === index);
        uniqueRoles.forEach(r => this.aclSvc.createRole(r));
        this.rules.forEach(r => {
            let rule = r.rule.trim().toLowerCase();
            let roles: string[] = (r.roles as any).split(',');
            roles.forEach(role => this.aclSvc.createRule(rule, role.trim().toLowerCase()));
        });
    }

    doFilter(req: ServletRequest, res: ServletResponse): void {
        let { token } = req.param;
        let identity = this.getIdenity(token);

        // Authentication check
        if (!identity) {
            this.logger.info(`Token ${token} is invalid`);
            res.json(getErrorStatus(HttpStatusCode.UNAUTHORIZED)).end();
            return;
        }

        // Authorization check
        let apiRegex = /^\/api\/v1\/(?<action>(create|update|delete))?\/?(?<resource>[^\s\/]{2,36})\/?(?<id>[^\s\/]{2,36})?(\/|$)/i;
        let authorized = apiRegex.test(req.url);
        if (authorized) {
            let { groups: { action, resource } } = apiRegex.exec(req.url);
            action = action || 'read';
            authorized = identity.roles.some(role => this.aclSvc.isAllowed(`${resource}.${action}`.toLowerCase(), role));
        }

        if (!authorized)
            res.json(getErrorStatus(HttpStatusCode.FORBIDDEN)).end();
    }

    private getIdenity(token: string): Identity {
        if (token) {
            let rec = this.identities.filter(id => id.token == token)[0];
            return rec ? {
                token: rec.token,
                roles: rec.roles.split(',').map(r => r.trim().toLocaleLowerCase())
            } : null;
        }
        return this.defaultRole ? {
            token: null,
            roles: [this.defaultRole]
        } : null;
    }
}