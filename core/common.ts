import { ServletRequest, ServletResponse, Filter, NotFoundHandler, LogLevel, ILogger, ICache, IConfiguration } from "./interfaces";

//#region Classes
export class SimpleLogger implements ILogger {
    private minLevel: LogLevel;

    constructor() {
        this.minLevel = LogLevel.INFO;
    }

    setLogLevel(level: LogLevel): void {
        this.minLevel = level;
    }

    error(message: any): void {
        if (this.minLevel <= LogLevel.ERROR) {
            let logMsg: string = typeof message === 'object' ? JSON.stringify(message) : message;
            Logger.log(logMsg);
        }
    }

    info(message: any): void {
        if (this.minLevel <= LogLevel.INFO) {
            let logMsg: string = typeof message === 'object' ? JSON.stringify(message) : message;
            Logger.log(logMsg);
        }
    }

    debug(message: any): void {
        if (this.minLevel <= LogLevel.DEBUG) {
            let logMsg: string = typeof message === 'object' ? JSON.stringify(message) : message;
            Logger.log(logMsg);
        }
    }
}

export class StackdriverLogger implements ILogger {
    private minLevel: LogLevel;

    constructor() {
        this.minLevel = LogLevel.INFO;
    }

    setLogLevel(level: LogLevel): void {
        this.minLevel = level;
    }

    error(message: any): void {
        if (this.minLevel <= LogLevel.ERROR) {
            let logMsg: string = typeof message === 'object' ? JSON.stringify(message) : message;
            console.error(logMsg);
        }
    }

    info(message: any): void {
        if (this.minLevel <= LogLevel.INFO) {
            let logMsg: string = typeof message === 'object' ? JSON.stringify(message) : message;
            console.info(logMsg);
        }
    }

    debug(message: any): void {
        if (this.minLevel <= LogLevel.DEBUG) {
            let logMsg: string = typeof message === 'object' ? JSON.stringify(message) : message;
            console.log(logMsg);
        }
    }
}

export class CacheProvider implements ICache {
    private logger: ILogger;
    private expiration: number = 20 * 60;
    private provider: GoogleAppsScript.Cache.Cache;

    constructor({ ILogger }: any) {
        this.logger = ILogger;
        this.provider = CacheService.getScriptCache();
    }

    setExpiration(value: number): void {
        this.expiration = value;
    }

    get(key: string): any {
        let value: string;
        let obj: any = null;
        value = this.provider.get(key);

        if (value) {
            try {
                obj = JSON.parse(value);
            }
            catch (e) {
                this.logger && this.logger.error(`CacheProvider -> ${e.stack}`);
                // Remove error key
                this.remove(key);
            }
        }
        return obj;
    }

    set(key: string, value: any): void {
        try {
            let json = JSON.stringify(value);
            this.provider.put(key, json, this.expiration);
        }
        catch (e) {
            this.logger && this.logger.error(`CacheProvider -> ${e.stack}`);
        }
    }

    remove(key: string): void {
        this.provider.remove(key);
    }

    removeAll(keys: string[]): void {
        this.provider.removeAll(keys);
    }
}

export class Configuration implements IConfiguration {
    private get store(): GoogleAppsScript.Properties.Properties {
        return PropertiesService.getScriptProperties();
    }

    get(key: string, value: string): string {
        var prop = this.store.getProperty(key);
        return prop ? prop : value;
    }

    set(key: string, value: string): void {
        this.store.setProperty(key, value);
    }
}

export class HttpFilter implements Filter {
    param: Record<string, any>;

    init(param?: Record<string, any>): void {
        this.param = param;
    }

    doFilter(request: ServletRequest, response: ServletResponse): void {
    }

    beforeGet(request: ServletRequest, response: ServletResponse): void {
    }

    afterGet(request: ServletRequest, response: ServletResponse): void {
    }

    beforePost(request: ServletRequest, response: ServletResponse): void {
    }

    afterPost(request: ServletRequest, response: ServletResponse): void {
    }
}

export class TextNotFoundHandler implements NotFoundHandler {
    doGet(): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
        return text('404 Not Found');
    }

    doPost(): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
        return text('404 Not Found');
    }
}

export class LogFilter extends HttpFilter {
    private logger: ILogger;

    constructor({ ILogger }: any) {
        super();
        this.logger = ILogger;
    }

    init(param?: Record<string, any>): void {
        super.init(param);
        this.logger.setLogLevel(this.param['level']);
    }

    doFilter(request: ServletRequest, response: ServletResponse): void {
        this.logger.debug(`${request.method} ${request.url} (${this.objectToString(request.param)})`);
        if (request.postData)
            this.logger.debug(request.postData);
    }

    private objectToString(obj: any): string {
        return Object.keys(obj).map(k => `${k}=${obj[k]}`).join('&');
    }
}
//#endregion

//#region Functions
export function ack(): GoogleAppsScript.Content.TextOutput {
    return ContentService.createTextOutput('');
}

export function json(res: any): GoogleAppsScript.Content.TextOutput {
    return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
}

export function text(res: string): GoogleAppsScript.Content.TextOutput {
    return ContentService.createTextOutput(res)
        .setMimeType(ContentService.MimeType.TEXT);
}

export function render(template: string, values?: any, title?: string): GoogleAppsScript.HTML.HtmlOutput {
    let view = HtmlService.createTemplateFromFile(`${template}`);
    title = title || '';
    if (values)
        Object.assign(view, values);
    return view.evaluate().setTitle(title)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

export function redirect(url: string, template: string = 'views/redirect'): GoogleAppsScript.HTML.HtmlOutput {
    return render(template, { url: url });
}

export function html(files: string[], ext?: string): string {
    return files.map(d => HtmlService.createHtmlOutputFromFile(`${d}${(ext || '')}`).getContent()).join('\n');
}

export function css(files: string[]) {
    return '<style>\n' + html(files, '.css') + '</style>\n';
}

export function js(files: string[]) {
    return '<script>\n' + html(files, '.js') + '</script>\n';
}
//#endregion