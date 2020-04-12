import { ICache } from "../core/interfaces";

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
    getColumns(): string[];
    setCache(cache: ICache): void;
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

export interface Schema {
    name: string;
    column: string;
    alias: string;
    primary: boolean;
    default: any;
    validation: string;
    format: string;
}

export interface Rule {
    action: string;
    role: string;
}

export interface IACLService {
    createRole(role: string): boolean;
    hasRole(role: string): boolean;
    createRule(rule: string, role: string): boolean;
    clear(): void;
    isAllowed(access: string, role: string): boolean;
    areAllowed(accessList: string[], role: string): boolean;
    anyAllowed(accessList: string[], role: string): boolean;
}