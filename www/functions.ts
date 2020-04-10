import { HttpStatusCode } from "../core/interfaces";
import jsonQuery from 'json-query';

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
        title: null
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