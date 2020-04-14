import { HttpStatusCode } from "../core/interfaces";
import jsonQuery from 'json-query';
import { error, not, empty } from "f-validator";

function getLocalHelpers(): any {
    return {
        eq: (str1: string, str2: string) => str1.toLowerCase() === str2.toLowerCase(),
        neq: (str1: string, str2: string) => str1.toLowerCase() !== str2.toLowerCase(),
        left: (str: string, len: number) => str.substr(0, len),
        right: (str: string, len: number) => str.substr(str.length - len, str.length),
        like: (str: string, sub: string) => str.includes(sub),
        notLike: (str: string, sub: string) => !str.includes(sub),
        empty: (str: string) => str ? str.trim().length == 0 : true,
        notEmpty: (str: string) => str ? str.trim().length > 0 : false
    }
}

export function extractSpreadsheetId(url: string): string {
    if (url) {
        let regex = /spreadsheets\/d\/(?<spreadsheetId>[a-zA-Z0-9-_]+)/i;
        const { groups: { spreadsheetId } } = regex.exec(url) as any;
        return spreadsheetId;
    }
    return null;
}

export function doQuery(query: string, data: any): any {
    return jsonQuery(query,
        {
            data: data,
            force: [],
            locals: getLocalHelpers(),
            allowRegexp: true
        }).value;
}

export function getStatusObject(status: HttpStatusCode): any {
    let error: any = {
        type: 'error',
        status: 0,
        title: null,
        detail: null
    };
    let success: any = {
        type: 'success',
        status: 0,
        results: null
    };
    switch (status) {
        case HttpStatusCode.OK:
            success.status = 200;
            return success;
        case HttpStatusCode.BAD_REQUEST:
            error.status = 400;
            error.title = 'Bad Request';
            return error;
        case HttpStatusCode.UNAUTHORIZED:
            error.status = 401;
            error.title = 'Unauthorized';
            return error;
        case HttpStatusCode.FORBIDDEN:
            error.status = 403;
            error.title = 'Forbidden';
            return error;
        case HttpStatusCode.NOT_FOUND:
            error.status = 404;
            error.title = 'Not Found';
            return error;
        case HttpStatusCode.INTERNAL_SERVER_ERROR:
            error.status = 500;
            error.title = 'Internal Server Error';
            return error;
    }
}

export function transform(list: any, options: { transform?: any, add?: any, remove?: string[], rename?: any }) {
    let source = Array.isArray(list) ? list : [list];
    return source.map(item => {
        let newObj: any = Object.assign({}, item);
        if (options.transform)
            Object.keys(options.transform).forEach(i => {
                if (newObj.hasOwnProperty(i))
                    newObj[i] = options.transform[i](item);
            });

        if (options.add)
            Object.keys(options.add).forEach(i => {
                newObj[i] = options.add[i](item);
            });

        if (options.remove)
            options.remove.forEach(i => {
                delete newObj[i];
            });

        if (options.rename) {
            let tmp: any = {};
            Object.keys(options.rename).forEach(i => {
                if (newObj.hasOwnProperty(i)) {
                    tmp[options.rename[i]] = newObj[i];
                    delete newObj[i];
                }
            });
            Object.assign(newObj, tmp);
        }
        return newObj;
    });
}

export function evalExp(exp: string, variables: any): any {
    let args = variables ? Object.keys(variables) : [];
    let body = `return ${exp};`;
    let func = Function.apply(Function, variables ? args.concat(body) : null);
    let values = variables ? args.map(a => variables[a]) : null;
    return func.apply(null, values);
}

export const required = not(empty);
export const blank = (s, path) => s.trim().length == 0 ? null : error(path, 'blank', s);

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const email = (s, path) => emailRegex.test(s) ? null : error(path, 'A valid email', s);

const urlRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;
export const url = (s, path) => urlRegex.test(s) ? null : error(path, 'A valid url', s);