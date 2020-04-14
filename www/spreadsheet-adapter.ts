import { ICache } from "../core/interfaces";

export class SpreadsheetAdapter {
    public static readonly sysId: string = '_rid_';
    protected sheet: GoogleAppsScript.Spreadsheet.Sheet;
    protected sheetName: string;
    protected spreadsheetId: string;
    protected header: string[];
    protected headerRange: GoogleAppsScript.Spreadsheet.Range;
    protected cache: ICache;
    protected excludedColumns: string[];
    protected pkType: 'auto' | 'uuid' | 'custom';
    protected pkColumn: string;

    constructor({ ICache }: any) {
        this.cache = ICache;
        this.excludedColumns = [];
        this.pkType = 'auto';
        this.pkColumn = null;
    }

    get startRow(): number {
        // Skip header row
        return this.headerRange.getLastRow() + 1;
    }

    get lastRow(): number {
        return this.sheet.getLastRow();
    }

    get startColumn(): number {
        return this.headerRange.getColumn();
    }

    get lastColumn(): number {
        return this.sheet.getLastColumn();
    }

    get numRows(): number {
        return this.lastRow - this.startRow + 1;
    }

    get numColumns(): number {
        return this.headerRange.getNumColumns();
    }

    //#region IDataAdapter
    init(params?: any) {
        let { name, id, headerA1Notation } = params;
        this.sheetName = name;
        this.sheet = id
            ? SpreadsheetApp.openById(id).getSheetByName(name)
            : SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
        this.spreadsheetId = this.sheet.getParent().getId();
        this.headerRange = headerA1Notation
            ? this.sheet.getRange(headerA1Notation)
            : this.sheet.getRange(1, 1, 1, this.lastColumn);
        this.header = this.headerRange.getValues()[0].map(h => this.normalize(h));
    }

    select(offset?: number, limit?: number): any[] {
        if (this.useCache) {
            let data = this.loadAllToCache();
            offset = offset ? offset : 1;
            limit = limit ? limit : this.numRows;
            limit = limit < this.numRows ? limit : this.numRows;
            return data.slice(offset - 1, limit);
        }
        return this.selectDirect(offset, limit);
    }

    selectWhere(where: (rec: any) => boolean, start?: number, size?: number): any[] {
        return this.select(start, size).filter(where);
    }

    insert(record: any): any {
        this._insert_(record);
        this.cleanCache();
        return record;
    }

    insertBatch(records: any[]): any[] {
        records.forEach(record => {
            this._insert_(record);
        });
        this.cleanCache();
        return records;
    }

    update(record: any): void {
        let rowId = record[SpreadsheetAdapter.sysId];
        if (rowId) {
            let item = this.objectToArray(record);
            this.sheet.getRange(rowId, this.startColumn, 1, item.length).setValues([item]);
            this.cleanCache();
        }
    }

    updateBatch(records: any[]): void {
        records.forEach(record => {
            let rowId = record[SpreadsheetAdapter.sysId];
            if (rowId) {
                let item = this.objectToArray(record);
                this.sheet.getRange(rowId, this.startColumn, 1, item.length).setValues([item]);
            }
        });
        this.cleanCache();
    }

    delete(rowId: number): void {
        this.sheet.deleteRow(rowId);
        this.cleanCache();
    }

    deleteBatch(rids: number[]): void {
        rids.forEach(rid => {
            this.sheet.deleteRow(rid);
        });
        this.cleanCache();
    }

    getEmptyRow(def: any): any {
        let dataRow: Record<string, any> = {};
        for (let j = 0, len = this.header.length; j < len; j++) {
            let colName = this.header[j];
            dataRow[colName] = def || null;
        }
        return dataRow;
    }

    getTotal(): number {
        return this.numRows;
    }

    getSessionId(): string {
        return `${this.spreadsheetId}.${this.sheetName}`;
    }

    getSysId(): string {
        return SpreadsheetAdapter.sysId;
    }

    getColumns(): string[] {
        return this.header;
    }

    setCache(cache: ICache) {
        this.cache = cache;
    }

    setExcludedColumns(columns: string[]): void {
        this.excludedColumns = columns;
    }

    setKeyType(type: 'auto' | 'uuid' | 'custom'): void {
        this.pkType = type;
    }

    setKeyColumn(pk: string): void {

    }
    //#endregion
    protected _insert_(record: any): any {
        let start = this.lastRow + 1;
        this.setKey(this.generateKey(), record);
        let arr = this.objectToArray(record);
        this.sheet.getRange(start, this.startColumn, 1, arr.length).setValues([arr]);
        return record;
    }

    protected generateKey(): any {
        switch (this.pkType) {
            case 'auto':
                return this.lastRow + 1;
            case 'uuid':
                return Utilities.getUuid();
            default:
                return null;
        }
    }

    protected setKey(value: any, rec: any): any {
        let key: any = null;
        if (this.pkColumn)
            key = this.pkColumn
        else if (this.pkType == 'auto')
            key = this.getSysId();
        if (key)
            rec[key] = value;
    }

    protected cleanCache() {
        if (this.useCache)
            this.cache.remove(this.getSessionId());
    }

    protected get useCache(): boolean {
        return !(this.cache === null || this.cache === undefined);
    }

    protected selectDirect(offset?: number, limit?: number): any[] {
        let numRowsOfHeader = this.headerRange.getLastRow() - this.headerRange.getRow() + 1;
        let start = offset ? offset * 1 : this.headerRange.getLastRow();
        offset = offset ? offset * 1 + numRowsOfHeader : this.startRow;
        limit = limit ? limit * 1 : this.numRows;
        limit = limit < this.numRows ? limit : this.numRows;
        let range = this.sheet.getRange(offset, this.startColumn, limit, this.numColumns);
        let data = range.getValues();
        let rows: any[] = [];

        for (let i = 0, len = data.length; i < len; i++) {
            let row: Record<string, any> = this.arrayToObject(data[i]);
            row[SpreadsheetAdapter.sysId] = start + i;
            rows.push(row);
        }
        return rows;
    }

    protected loadAllToCache(): any[] {
        let id = this.getSessionId();
        let rows: any[] = this.cache.get(id);
        if (!rows) {
            let range = this.sheet.getRange(this.startRow, this.startColumn, this.numRows, this.numColumns);
            let data = range.getValues();
            let start = this.headerRange.getLastRow();
            rows = [];

            for (let i = 0, len = data.length; i < len; i++) {
                let row: Record<string, any> = this.arrayToObject(data[i]);
                row[SpreadsheetAdapter.sysId] = start + i;
                rows.push(row);
            }
            this.cache.set(id, rows);
        }
        return rows;
    }

    protected arrayToObject(arr: any[]): any {
        let obj: Record<string, any> = {};
        for (let j = 0, len = this.header.length; j < len; j++) {
            let colName = this.header[j];
            if (!this.excludedColumns.includes(colName))
                obj[colName] = arr[j];
        }
        return obj;
    }

    protected objectToArray(obj: any): any[] {
        return this.header.map(col => obj[col]);
    }

    protected normalize(name: string): string {
        return name.trim();
    }
}