//#region Enumerations
export enum HttpStatusCode {
    OK = 200,
    TEMPORARY_REDIRECT = 307,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    METHOD_NOT_ALLOWED = 405,
    INTERNAL_SERVER_ERROR = 500,
}

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    ERROR = 2
}
//#endregion

//#region Interfaces
export interface WebConfig {
    name: string;
    description?: string;
    context: Record<string, any>;
    filters: FilterConfig[];
    servlets: ServletConfig[];
    routes: RouteConfig[];
}

export interface FilterConfig {
    name: string;
    description?: string;
    param?: Record<string, any>;
    order?: number;
}

export interface ServletConfig {
    name: string;
    description?: string;
    param?: Record<string, any>;
}

export interface RouteConfig {
    method: 'GET' | 'POST';
    handler: string | Function;
    patterns: (string | RegExp)[];
}

export interface RequestDispatcher {
    forward(request: ServletRequest, response: ServletResponse): Promise<void>;
}

export interface Filter {
    param: Record<string, any>;
    init(param?: Record<string, any>): void;
    doFilter(request: ServletRequest, response: ServletResponse): void;
    beforeGet(request: ServletRequest, response: ServletResponse): void;
    afterGet(request: ServletRequest, response: ServletResponse): void;
    beforePost(request: ServletRequest, response: ServletResponse): void;
    afterPost(request: ServletRequest, response: ServletResponse): void;
}

export interface IContainer {
    get(name: string): any;
}

export interface IRouter {
    add(method: string, route: string | RegExp, ...fns: any[]): any;
    find(method: string, url: string): { params: Record<string, any>, handlers: any[] };
}

export interface Servlet {
    param: Record<string, any>;
    context: Record<string, any>;
    init(config?: Record<string, any>, context?: Record<string, any>): void;
    doGet(req: ServletRequest, res: ServletResponse): Promise<void>;
    doPost(req: ServletRequest, res: ServletResponse): Promise<void>;
}

export interface ServletContainer {
    path: string;
    init(config: WebConfig, di: IContainer): void;
}

export interface ServletRequest {
    var: Record<string, any>;
    method: string;
    param: Record<string, any>;
    params: Record<string, any[]>;
    protocol: string;
    secure: boolean;
    raw: RequestEvent;
    url: string;
    postData: any;
    type: string;
    init(method: 'GET' | 'POST', request: RequestEvent): void;
}

export interface ServletResponse {
    committed: boolean;
    status: number;
    output: GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput;
    end(): void;
    redirect(url: string): void;
    send(body: any, status?: number): ServletResponse;
    json(body: any, status?: number): ServletResponse;
    contentType(type: 'text' | 'html'): ServletResponse;
    mime(type: GoogleAppsScript.Content.MimeType): ServletResponse;
}

export interface NotFoundHandler {
    doGet(): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput;
    doPost(): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput;
}

export interface ILogger {
    setLogLevel(level: LogLevel): void;
    error(message: any): void;
    info(message: any): void;
    debug(message: any): void;
}

export interface ICache {
    setExpiration(value: number): void;
    get(key: string): any;
    set(key: string, value: any): void;
    remove(key: string): void;
    removeAll(keys: string[]): void;
}

export interface IConfiguration {
    get(key: string, value?: string): string;
    set(key: string, value: string): void;
}

export interface RequestEvent {
    queryString: string;
    parameter: {
        [index: string]: string;
    };
    parameters: {
        [index: string]: [string];
    };
    contextPath: string; // Not used, always the empty string
    contentLength: number;
    postData: {
        length: number;
        type: string;
        contents: string;
        name: string;
    };
}
//#endregion