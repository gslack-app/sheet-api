import { ApiServlet, ApiNotFoundHandler } from "./api";
import { ApiGatekeeper } from "./api-gatekeeper";
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
        Browser.msgBox(err);
    }
}

function clearCache(): void {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let id = ss.getId();
    let cacheSvc: CacheProvider = getDI().get('ICache');
    ss.getSheets().forEach(sheet => {
        cacheSvc.remove(`${id}.${sheet.getName()}`);
    });
    Browser.msgBox('Cache cleaned up');
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

function a() {
    let sa = new SpreadsheetAdapter();
    sa.init({ name: 'Customers' });
    let obj = sa.getEmptyRow('');
    Logger.log(JSON.stringify(obj));
}
