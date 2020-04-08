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