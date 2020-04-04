// Entry point - CUSTOMIZE YOUR OWN
import { render, Configuration, LogFilter, StackdriverLogger, html, css, js } from "../core/common";
import { LogLevel, WebConfig } from "../core/interfaces";
import { HttpServletResponse, HttpServletContainer, HttpServletRequest } from "../core/servlet";
import { DependencyInjection } from "../core/vendors";
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
    let logger = getDI().get('ILogger');
    let logLevel: any = PropertiesService.getScriptProperties().getProperty('app.logLevel') || LogLevel.INFO;

    return {
        name: appName,
        description: 'GSlack Servlet',
        servlets: [
        ],
        routes: [
            {
                method: 'GET',
                handler: () => render('views/404', null, appName),
                pattern: '/404'
            },
            {
                method: 'GET',
                handler: () => render('views/index', null, appName),
                pattern: '/'
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
    return new DependencyInjection([
        { name: 'ServletRequest', useClass: HttpServletRequest },
        { name: 'ServletResponse', useClass: HttpServletResponse },
        { name: 'IConfiguration', useClass: Configuration },
        { name: 'ILogger', useClass: StackdriverLogger },
        { name: 'LogFilter', useClass: LogFilter, deps: ['ILogger'] },
    ]);
}

function test() {
    let sa = new SpreadsheetAdapter("Customers");
    let data = sa.select();
    Logger.log(JSON.stringify(data));
    Logger.log(`Lenght ${data.length}`);
}