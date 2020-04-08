// Entry point - CUSTOMIZE YOUR OWN
import { render, Configuration, LogFilter, StackdriverLogger, html, css, js, CacheProvider } from "../core/common";
import { LogLevel, WebConfig } from "../core/interfaces";
import { HttpServletResponse, HttpServletContainer, HttpServletRequest } from "../core/servlet";
import { DependencyInjection } from "../core/vendors";
import { ApiServlet, ApiNotFoundHandler } from "./api";
import { SpreadsheetAdapter } from "./spreadsheet-adapter";

// declare var global: any;
// global.doGet = doGet;
// global.doPost = doPost;
// global.onOpen = onOpen;
// global.authorizeScript = authorizeScript;
// global.html = html;
// global.css = css;
// global.js = js;
let appName: string = 'GSlack SheetAPI';

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

function getConfig(): WebConfig {
    let logLevel: any = PropertiesService.getScriptProperties().getProperty('app.logLevel') || LogLevel.INFO;
    return {
        name: appName,
        description: 'GSlack Sheet API',
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
            // Filters
            {
                name: 'LogFilter',
                order: 0,
                // Variables at filter scope
                param: { level: logLevel }
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
        { name: 'ILogger', useClass: StackdriverLogger },
        { name: 'IDataAdapter', useClass: SpreadsheetAdapter },
        { name: 'LogFilter', useClass: LogFilter, deps: ['ILogger'] },
        { name: 'ApiServlet', useClass: ApiServlet, deps: ['ICache', 'ILogger', 'IDataAdapter'] },
    ]);
}

function a() {
    let sa = new SpreadsheetAdapter();
    sa.init({ name: 'Customers' });
    let obj = sa.getEmptyRow('');
    Logger.log(JSON.stringify(obj));
}
