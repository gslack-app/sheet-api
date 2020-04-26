import { ICache } from "../core/interfaces";

export interface IDataAdapter {
    init(params?: any);
    select(offset?: number, limit?: number): any[];
    selectByKey(id: any): any[];
    insert(record: any): any;
    insertBatch(records: any[]): any[];
    update(record: any): void;
    updateBatch(records: any[]): void;
    delete(rowId: number): void;
    deleteBatch(rids: any[]): void;
    getSysId(): string;
    getColumns(): string[];
    setCache(cache: ICache): void
    setKeyColumn(pk: string): void;
    setKeyType(type: 'auto' | 'uuid' | 'custom', seed?: number, step?: number): void;
}

export interface IQueryAdapter {
    init(params?: any);
    query(sql: string): any[];
    exportToCsv(sql: string): string;
    getColumns(): string[];
    getIds(): string[];
    setFormat(format: 'csv' | 'json');
    getIdByColumn(column: string): string;
    getColumnById(id: string): string;
}

export interface Identity {
    apiKey: string;
    roles: string[];
}

export interface Resource {
    name: string;
    url: string;
    sheet: string;
    limitGet: number;
}

export interface Schema {
    resource: string;
    column: string;
    alias: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
    primary: string;
    default: any;
    validation: string;
    format: string;
    seed?: number;
    step?: number;
}

export interface Rule {
    rule: string;
    roles: string[];
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