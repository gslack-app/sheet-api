import { ApiServlet, ApiNotFoundHandler } from "./api";
import { ApiGatekeeper } from "./api-gatekeeper";
import { Resource } from "./interfaces";
import { SpreadsheetAdapter } from "./spreadsheet-adapter";
import { ResourceHandler } from "./resource-handler";
import { Configuration, LogFilter, StackdriverLogger, CacheProvider } from "../core/common";
import { LogLevel, WebConfig } from "../core/interfaces";
import { HttpServletResponse, HttpServletContainer, HttpServletRequest } from "../core/servlet";
import { DependencyInjection } from "../core/vendors";

declare var global: any;
global.doGet = doGet;
global.doPost = doPost;
global.onOpen = onOpen;
global.authorizeScript = authorizeScript;
global.clearCache = clearCache;
let appName: string = 'Sheet API';

function doGet(request: any): any {
    let container = new HttpServletContainer();
    container.init(getConfig(), getDI());
    return container.doGet(request);
}

function doPost(request: any): any {
    let container = new HttpServletContainer();
    container.init(getConfig(), getDI());
    return container.doPost(request);
}

function onOpen(e: any): void {
    try {
        var spreadsheet = SpreadsheetApp.getActive();
        var menuItems = [
            { name: 'Authorize', functionName: 'authorizeScript' },
            { name: 'Clear Cache', functionName: 'clearCache' },
        ];
        spreadsheet.addMenu(appName, menuItems);
    }
    catch (err) {
        Browser.msgBox(err);
    }
}

function authorizeScript(): void {
    try {
        let authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
        let message = authInfo.getAuthorizationStatus() == ScriptApp.AuthorizationStatus.REQUIRED
            ? 'Authorization Failed'
            : 'Authorization Success';
        Browser.msgBox(appName, message, Browser.Buttons.OK);
    }
    catch (err) {
        Browser.msgBox(appName, err, Browser.Buttons.OK);
    }
}

function clearCache(): void {
    // Clear system cache
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let id = ss.getId();
    let cacheSvc: CacheProvider = getDI().get('ICache');
    let caches: string[] = [];
    ss.getSheets().forEach(sheet => {
        let cacheId = `${id}.${sheet.getName()}`;
        caches.push(cacheId);
        cacheSvc.remove(cacheId);
    });

    // Clear data cache
    let adapter = new SpreadsheetAdapter();
    adapter.init({ name: 'Resources' });
    let resources: Resource[] = adapter.select();
    resources.forEach(res => {
        let regex = /spreadsheets\/d\/(?<spreadsheetId>[a-zA-Z0-9-_]+)/i;
        const { groups: { spreadsheetId } } = regex.exec(res.url) as any;
        let cacheId = `${spreadsheetId}.${res.name.trim()}`;
        caches.push(cacheId);
        cacheSvc.remove(cacheId);
    });
    Browser.msgBox(appName, `The cache \\n${caches.join('\\n  ')}\\nare cleaned up`, Browser.Buttons.OK);
}

function getConfig(): WebConfig {
    let logLevel: any = PropertiesService.getScriptProperties().getProperty('app.logLevel') || LogLevel.INFO;
    return {
        name: appName,
        description: 'Sheet API',
        servlets: [
            {
                name: 'ApiServlet'
            }
        ],
        routes: [
            {
                method: 'GET',
                handler: 'ApiServlet',
                patterns: [
                    /\/api\/v1\/(?<resource>\w+)\/?$/i,
                    /\/api\/v1\/(?<resource>\w+)\/(?<id>\d+)\/?$/i
                ]
            },
            {
                method: 'POST',
                handler: 'ApiServlet',
                patterns: [
                    /\/api\/v1\/(?<action>create)\/(?<resource>\w+)\/?$/i,
                    /\/api\/v1\/(?<action>(update|delete))\/(?<resource>\w+)\/(?<id>\d+)\/?$/i
                ]
            }
        ],
        context: {
            // Variables at servlet scope
        },
        filters: [
            {
                name: 'LogFilter',
                order: 0,
                param: { level: logLevel }
            },
            {
                name: 'ApiGatekeeper',
                order: 1,
                param: {
                    authentication: 'Authentication',
                    authorization: 'Authorization'
                }
            },
            {
                name: 'ResourceHandler',
                order: 2,
                param: {
                    resources: 'Resources'
                }
            }
        ]
    }
};

function getDI(): DependencyInjection {
    return new DependencyInjection([//
        { name: 'ServletRequest', useClass: HttpServletRequest },
        { name: 'ServletResponse', useClass: HttpServletResponse },
        { name: 'NotFoundHandler', useClass: ApiNotFoundHandler },
        { name: 'IConfiguration', useClass: Configuration },
        { name: 'ICache', useClass: CacheProvider },
        { name: 'ILogger', useClass: StackdriverLogger, singleton: true },
        { name: 'IDataAdapter', useClass: SpreadsheetAdapter },
        { name: 'LogFilter', useClass: LogFilter, deps: ['ILogger'] },
        { name: 'ApiServlet', useClass: ApiServlet, deps: ['ICache', 'ILogger', 'IDataAdapter'] },
        { name: 'ApiGatekeeper', useClass: ApiGatekeeper, deps: ['ICache', 'ILogger', 'IDataAdapter'] },
        { name: 'ResourceHandler', useClass: ResourceHandler, deps: ['ICache', 'ILogger', 'IDataAdapter'] }
    ]);
}