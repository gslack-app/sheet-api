import { ApiServlet, ApiNotFoundHandler } from "./api";
import { ApiGatekeeper } from "./api-gatekeeper";
import { EnhancedCache } from "./enhanced-cache";
import { Resource } from "./interfaces";
import { SpreadsheetAdapter } from "./spreadsheet-adapter";
import { ResourceHandler } from "./resource-handler";
import { Configuration, LogFilter, StackdriverLogger } from "../core/common";
import { LogLevel, WebConfig, ICache } from "../core/interfaces";
import { HttpServletResponse, HttpServletContainer, HttpServletRequest } from "../core/servlet";
import { DependencyInjection } from "../core/vendors";
import { extractSpreadsheetId } from "./functions";

declare var global: any;
global.doGet = doGet;
global.doPost = doPost;
global.onOpen = onOpen;
global.authorizeScript = authorizeScript;
global.clearSystemCache = clearSystemCache;
global.clearDataCache = clearDataCache;
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
            { name: 'Clear System Cache', functionName: 'clearSystemCache' },
            { name: 'Clear Data Cache', functionName: 'clearDataCache' }
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

function clearDataCache(): void {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let id = ss.getId();
    let di = getDI();
    let cacheSvc: any = di.get('ICache');
    let adapter = di.get('IDataAdapter');
    adapter.setCache(null);
    adapter.init({ name: 'Resources' });
    let resources: Resource[] = adapter.select();
    let keys: string[] = resources.map(res => {
        let spreadsheetId = extractSpreadsheetId(res.url) || id;
        return `${spreadsheetId}.${res.sheet.trim()}`;
    });
    cacheSvc.removeAll(keys);
    Browser.msgBox(appName, `The cache \\n${keys.join('\\n  ')}\\nare cleaned up`, Browser.Buttons.OK);
}

function clearSystemCache(): void {
    // Clear system cache
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let id = ss.getId();
    let di = getDI();
    let cacheSvc: ICache = di.get('ICache');
    let keys: string[] = ss.getSheets().map(sheet => `${id}.${sheet.getName()}`);
    cacheSvc.removeAll(keys);
    Browser.msgBox(appName, `The cache \\n${keys.join('\\n  ')}\\nare cleaned up`, Browser.Buttons.OK);
}

function getConfig(): WebConfig {
    let logLevel: any = PropertiesService.getScriptProperties().getProperty('app.logLevel') || LogLevel.INFO;
    return {
        name: appName,
        description: 'Sheet API',
        servlets: [
            {
                name: 'ApiServlet',
                param: {
                    schemas: 'Schemas'
                }
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
        { name: 'ILogger', useClass: StackdriverLogger, singleton: true },
        { name: 'ICache', useClass: EnhancedCache, deps: ['ILogger'] },
        { name: 'IDataAdapter', useClass: SpreadsheetAdapter, deps: ['ICache'] },
        { name: 'LogFilter', useClass: LogFilter, deps: ['ILogger'] },
        { name: 'ApiServlet', useClass: ApiServlet, deps: ['ILogger', 'IDataAdapter'] },
        { name: 'ApiGatekeeper', useClass: ApiGatekeeper, deps: ['ILogger', 'IDataAdapter'] },
        { name: 'ResourceHandler', useClass: ResourceHandler, deps: ['ILogger', 'IDataAdapter'] }
    ]);
}