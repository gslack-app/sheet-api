import { ApiServlet, ApiNotFoundHandler } from "./api";
import { ApiGatekeeper } from "./api-gatekeeper";
import { SpreadsheetAdapter } from "./spreadsheet-adapter";
import { ResourceHandler } from "./resource-handler";
import { Configuration, LogFilter, StackdriverLogger, CacheProvider } from "../core/common";
import { LogLevel, WebConfig, ICache } from "../core/interfaces";
import { HttpServletResponse, HttpServletContainer, HttpServletRequest } from "../core/servlet";
import { DependencyInjection } from "../core/vendors";
import { QueryAdapter } from "./query-adapter";

let appName: string = PropertiesService.getScriptProperties().getProperty('app.name') || 'Sheet API';

export function doGet(request: any): any {
    let container = new HttpServletContainer();
    container.init(getConfig(), getDI());
    return container.doGet(request);
}

export function doPost(request: any): any {
    let container = new HttpServletContainer();
    container.init(getConfig(), getDI());
    return container.doPost(request);
}

export function onOpen(e: any): void {
    try {
        var spreadsheet = SpreadsheetApp.getActive();
        var menuItems = [
            { name: 'Authorize', functionName: 'authorizeScript' },
            { name: 'Initialize Settings', functionName: 'initSettings' },
            { name: 'Clear System Cache', functionName: 'clearSystemCache' }
        ];
        spreadsheet.addMenu(appName, menuItems);
    }
    catch (err) {
        Browser.msgBox(err);
    }
}

export function initSettings(): void {
    try {
        let propSvc = PropertiesService.getScriptProperties();
        let settings: any = {
            'app.name': 'Sheet API',
            'app.logLevel': '1',
            'app.defaultRole': 'anonymous',
            'app.query.no_format': '1',
            'app.query.limit': '20'
        };
        Object.keys(settings).forEach(prop => {
            let value = propSvc.getProperty(prop);
            if (!value)
                propSvc.setProperty(prop, settings[prop]);
        });
        Browser.msgBox(appName, 'Please configure the initialized settings', Browser.Buttons.OK);
    }
    catch (err) {
        Browser.msgBox(err);
    }
}

export function authorizeScript(): void {
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

export function clearSystemCache(): void {
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
    let defaultRole: any = PropertiesService.getScriptProperties().getProperty('app.defaultRole');
    let noFormat: any = PropertiesService.getScriptProperties().getProperty('app.query.no_format');
    let limit: any = PropertiesService.getScriptProperties().getProperty('app.query.limit');

    return {
        name: appName,
        description: 'Sheet API',
        servlets: [
            {
                name: 'ApiServlet',
                param: {
                    schemas: 'Schemas',
                    noFormat: noFormat ? parseInt(noFormat) : 1,
                    limit: limit ? parseInt(limit) : 20
                }
            }
        ],
        routes: [
            {
                method: 'GET',
                handler: 'ApiServlet',
                patterns: [
                    /^\/api\/v1\/(?<resource>[^\s\/]{2,36})\/?(?<id>[^\s\/]{2,36})?(\/|$)/i
                ]
            },
            {
                method: 'POST',
                handler: 'ApiServlet',
                patterns: [
                    /^\/api\/v1\/(?<action>(create))\/(?<resource>[^\s\/]{2,36})(\/|$)/i,
                    /^\/api\/v1\/(?<action>(update|delete))\/(?<resource>[^\s\/]{2,36})\/?(?<id>[^\s\/]{2,36})?(\/|$)/i
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
                    authorization: 'Authorization',
                    defaultRole: defaultRole
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
    return new DependencyInjection([
        { name: 'ServletRequest', useClass: HttpServletRequest },
        { name: 'ServletResponse', useClass: HttpServletResponse },
        { name: 'NotFoundHandler', useClass: ApiNotFoundHandler },
        { name: 'IConfiguration', useClass: Configuration },
        { name: 'ILogger', useClass: StackdriverLogger, singleton: true },
        { name: 'ICache', useClass: CacheProvider, deps: ['ILogger'] },
        { name: 'IDataAdapter', useClass: SpreadsheetAdapter, deps: ['ICache'] },
        { name: 'IQueryAdapter', useClass: QueryAdapter, deps: ['ILogger'] },
        { name: 'LogFilter', useClass: LogFilter, deps: ['ILogger'] },
        { name: 'ApiServlet', useClass: ApiServlet, deps: ['ILogger', 'IQueryAdapter', 'IDataAdapter'] },
        { name: 'ApiGatekeeper', useClass: ApiGatekeeper, deps: ['ILogger', 'IDataAdapter'] },
        { name: 'ResourceHandler', useClass: ResourceHandler, deps: ['IDataAdapter'] }
    ]);
}