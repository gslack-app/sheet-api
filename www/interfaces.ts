export interface IDataAdapter {
    init(params?: any);
    select(offset?: number, limit?: number): any[];
    selectWhere(where: (rec: any) => boolean, offset?: number, limit?: number): any[];
    insert(record: any): any;
    insertBatch(records: any[]): any[];
    update(record: any): void;
    updateBatch(records: any[]): void;
    delete(rowId: number): void;
    deleteBatch(rids: number[]): void;
    getEmptyRow(def: any): any;
    getTotal(): number;
    getSessionId(): string;
    getSysId(): string;
}

export interface Identity {
    token: string;
    roles: string[];
}

export interface Resource {
    name: string;
    url: string;
    sheet: string;
}

export interface Rule {
    action: string;
    role: string;
}

export declare namespace acl {
    export class ACLService {
        createRole(role: string): boolean;
        hasRole(role: string): boolean;
        createRule(rule: string, role: string): boolean;
        clear(): void;
        isAllowed(access: string, role: string): boolean;
        areAllowed(accessList: string[], role: string): boolean;
        anyAllowed(accessList: string[], role: string): boolean;
    }
}

export declare function jsonQuery(query: string, options: {
    data?: any;
    rootContext?: any;
    source?: any;
    context?: any;
    parent?: any;
    locals?: any;
    globals?: any;
    force?: any[];
    allowRegexp?: boolean;
}): {
    value: any | any[];
    key: number | number[];
    references: any[] | any[][];
    parents: any[];
};
