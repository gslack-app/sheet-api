import { redirect } from "./common";
import { ServletRequest, RequestEvent, ServletResponse, HttpStatusCode, Servlet, Filter, NotFoundHandler, ServletContainer, WebConfig, ServletConfig, IContainer, IRouter } from "./interfaces";
import { Trouter } from "./vendors";

//#region Classes
export class HttpServletRequest implements ServletRequest {
    var: Record<string, any>;
    method: 'GET' | 'POST';
    protocol: string;
    secure: boolean;
    raw: RequestEvent;
    param: Record<string, any>;
    params: Record<string, any[]>;
    postData: any;
    type: string;
    url: string;

    constructor() {
        this.var = {};
        this.protocol = 'https';
        this.secure = true;
    }

    init(method: 'GET' | 'POST', request: RequestEvent) {
        this.raw = request;
        this.method = method;

        if (request.postData) {
            this.type = request.postData.type;
            switch (this.type) {
                case 'application/json':
                    try {
                        this.postData = JSON.parse(request.postData.contents);
                    }
                    catch {
                        this.postData = null;
                    }
                    break;
                default:
                    this.postData = request.postData.contents;
                    break;
            }
        }

        this.param = request.parameter;
        this.params = request.parameters;
        this.url = this.param['url'] || '/';
    }
}

export class HttpServletResponse implements ServletResponse {
    private code: number;
    private isCommitted: boolean;
    private type: 'text' | 'html';
    protected text: GoogleAppsScript.Content.TextOutput;
    protected html: GoogleAppsScript.HTML.HtmlOutput;
    output: GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput;

    constructor() {
        this.contentType('text');
        this.code = HttpStatusCode.OK;
        this.isCommitted = false;
        this.output = this.text;
    }

    get committed(): boolean {
        return this.isCommitted;
    }

    contentType(type: 'text' | 'html'): ServletResponse {
        this.type = type;
        switch (type) {
            case 'text':
                if (!this.text)
                    this.text = ContentService.createTextOutput();
                break;
            case 'html':
                if (!this.html)
                    this.html = HtmlService.createHtmlOutput();
                break;
        }
        return this;
    }

    end(): void {
        this.isCommitted = true;
    }

    mime(type: GoogleAppsScript.Content.MimeType): ServletResponse {
        this.text.setMimeType(type);
        return this;
    }

    get status(): number {
        return this.code;
    }

    redirect(url: string): void {
        this.code = HttpStatusCode.TEMPORARY_REDIRECT;
        this.contentType('text').send(url).end();
    }

    send(body: any, status?: number): ServletResponse {
        if (this.isCommitted)
            throw "Can't set headers after they are sent";

        if (status)
            this.code = status;
        let content: string = typeof body === 'object' && body ? body.toString() : body;

        switch (this.type) {
            case 'text':
                this.text.append(content);
                this.output = this.text;
                break;
            case 'html':
                this.html.append(content);
                this.output = this.html;
                break;
        }
        return this;
    }

    json(body: any, status?: number): ServletResponse {
        if (this.isCommitted)
            return this;
        if (status)
            this.code = status;
        this.mime(ContentService.MimeType.JSON);
        let content = JSON.stringify(body);
        this.text.append(content);
        this.output = this.text;
        return this;
    }
}

export class HttpServlet implements Servlet {
    param: Record<string, any>;
    context: Record<string, any>;

    init(param?: Record<string, any>, context?: Record<string, any>): void {
        this.param = param;
        this.context = context;
    }

    async doGet(req: ServletRequest, res: ServletResponse): Promise<void> {
    }

    async doPost(req: ServletRequest, res: ServletResponse): Promise<void> {
    }
}

export class HttpServletContainer implements ServletContainer {
    protected config: WebConfig;
    protected di: IContainer;
    protected router: IRouter;
    protected notFound: NotFoundHandler;

    get path(): string {
        return ScriptApp.getService().getUrl();
    }

    init(config: WebConfig, di: IContainer, handler404: string = 'NotFoundHandler'): void {
        this.config = config;
        this.di = di;
        this.router = new Trouter();
        this.notFound = this.di.get(handler404);

        this.config.routes.forEach(sr => {
            // Lazy initialization for servlet
            sr.patterns.forEach(p => {
                this.router.add(sr.method, p, sr.handler);
            });
        });
    }

    doGet(request: RequestEvent): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
        let req: ServletRequest = this.di.get('ServletRequest');
        let res: ServletResponse = this.di.get('ServletResponse');
        req.init('GET', request);
        this.applyFilter(req, res);

        if (res.committed)
            return res.output;

        let route = this.router.find('GET', req.url);
        if (route.handlers.length) {
            let servlets: string[] = [];
            req.var['_get_'] = route.params;

            for (let i = 0; i < route.handlers.length; i++) {
                let handler = route.handlers[i];
                if (typeof handler === 'string') {
                    servlets.push(handler);
                } else {
                    // Support 1 function handler per url
                    if (route.params && Object.keys(route.params).length) {
                        let values = Object.keys(route.params).map((k) => route.params[k]);
                        return handler.apply(null, values);
                    }
                    return handler();
                }
            }

            this.initServlet(servlets).forEach(servlet => {
                servlet.doGet(req, res);
            });
            res.end();

            if (res.status == HttpStatusCode.TEMPORARY_REDIRECT) {
                let url = res.output.getContent();
                if (url.indexOf('http') == -1)
                    url = `${this.path}?url=${url}`;
                return redirect(url);
            }
            return res.output;
        }
        return this.notFound.doGet();
    }

    doPost(request: RequestEvent): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
        let req: ServletRequest = this.di.get('ServletRequest');
        let res: ServletResponse = this.di.get('ServletResponse');
        req.init('POST', request);
        this.applyFilter(req, res);

        if (res.committed)
            return res.output;

        let route = this.router.find('POST', req.url);
        if (route.handlers.length) {
            let servlets: string[] = [];
            req.var['_post_'] = route.params;

            for (let i = 0; i < route.handlers.length; i++) {
                let handler = route.handlers[i];
                if (typeof handler === 'string') {
                    servlets.push(handler);
                } else {
                    // Support 1 function handler per url
                    if (route.params && Object.keys(route.params).length) {
                        let values = Object.keys(route.params).map((k) => route.params[k]);
                        return handler.apply(null, values);
                    }
                    return handler();
                }
            }

            this.initServlet(servlets).forEach(servlet => {
                servlet.doPost(req, res);
            });
            res.end();
            return res.output;
        }
        return this.notFound.doPost();
    }

    protected applyFilter(request: ServletRequest, response: ServletResponse): void {
        // Apply filters by order
        this.config.filters.sort((a, b) => a.order - b.order);
        for (let i = 0; i < this.config.filters.length; i++) {
            let fc = this.config.filters[i];
            let filter: Filter = this.di.get(fc.name);

            if (filter) {
                filter.init(fc.param);
                filter.doFilter(request, response);
            }

            if (response.committed)
                break;
        };
    }

    protected getServletConfig(name: string): ServletConfig {
        let idx = this.config.servlets.map(s => s.name).indexOf(name);
        return idx > -1 ? this.config.servlets[idx] : null;
    }

    protected initServlet(handlers: string[]): Servlet[] {
        let servlets: Servlet[] = [];
        handlers.forEach(name => {
            let servlet: Servlet = this.di.get(name);
            if (servlet) {
                let cfg = this.getServletConfig(name);
                servlet.init(cfg.param, this.config.context);
                servlets.push(servlet);
            }
        });
        return servlets;
    }
}
//#endregion