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
    protected pkSeed: number;
    protected pkStep: number;

    constructor({ ICache }: any) {
        this.cache = ICache;
        this.excludedColumns = [];
        this.pkType = 'auto';
        this.pkColumn = null;
        this.pkSeed = 0;
        this.pkStep = 1;
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

    get useCache(): boolean {
        return !(this.cache === null || this.cache === undefined);
    }

    //#region IDataAdapter
    init(params?: any) {
        let { name, id, headerA1 } = params;
        this.sheetName = name;
        let ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
        this.sheet = ss.getSheetByName(name);
        this.spreadsheetId = ss.getId();
        this.headerRange = headerA1
            ? this.sheet.getRange(headerA1)
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

    selectByKey(id: any): any[] {
        var value = typeof id === 'object' ? id[this.pkColumn] : id.toString();
        var searchRange = this.sheet.getRange(this.startRow, this.startColumn + this.header.indexOf(this.pkColumn), this.numRows, 1);
        let matches = searchRange.createTextFinder(value)
            .matchEntireCell(true)
            .matchCase(false)
            .ignoreDiacritics(false)
            .findAll();
        return matches.map(match => {
            let start = match.getRow();
            let range = this.sheet.getRange(start, this.startColumn, 1, this.numColumns);
            let row = this.arrayToObject(range.getValues()[0]);
            row[this.getSysId()] = start;
            return row;
        });
    }

    insert(record: any): any {
        this._insert_(record);
        this.cleanCache();
        return record;
    }

    insertBatch(records: any[]): any[] {
        records.forEach(record => this._insert_(record));
        this.cleanCache();
        return records;
    }

    update(record: any): void {
        this._update_(record);
        this.cleanCache();
    }

    updateBatch(records: any[]): void {
        records.forEach(record => this._update_(record));
        this.cleanCache();
    }

    delete(rowId: number): void {
        this._delete_(rowId);
        this.cleanCache();
    }

    deleteBatch(rowIds: number[]): void {
        // Delete the row with largest id first
        let rids = rowIds.map(r => r * 1).sort((a, b) => b - a);
        rids.forEach(rid => this._delete_(rid));
        this.cleanCache();
    }

    getSysId(): string {
        return SpreadsheetAdapter.sysId;
    }

    getColumns(): string[] {
        return this.header;
    }

    setCache(cache: ICache): void {
        this.cache = cache;
    }

    setKeyType(type: 'auto' | 'uuid' | 'custom', seed?: number, step?: number): void {
        this.pkType = type;
        this.pkSeed = seed ? seed * 1 : 0;
        this.pkStep = step ? step * 1 : 1;
    }

    setKeyColumn(pk: string): void {
        this.pkColumn = pk;
    }
    //#endregion

    protected getSessionId(): string {
        return `${this.spreadsheetId}.${this.sheetName}`;
    }

    protected selectWhere(where: (rec: any) => boolean, start?: number, size?: number): any[] {
        return this.select(start, size).filter(where);
    }

    protected _insert_(record: any): any {
        let start = this.lastRow + 1;
        this.setKey(this.generateKey(), record);
        let arr = this.objectToArray(record);
        this.sheet.getRange(start, this.startColumn, 1, arr.length).setValues([arr]);
        return record;
    }

    protected _update_(record: any): void {
        let rowId = record[this.getSysId()];
        if (rowId) {
            let item = this.objectToArray(record);
            this.sheet.getRange(rowId, this.startColumn, 1, item.length).setValues([item]);
        }
    }

    protected _delete_(rowId: number): void {
        if (rowId)
            this.sheet.deleteRow(rowId);
    }

    protected generateKey(): any {
        switch (this.pkType) {
            case 'auto':
                return this.pkSeed + this.numRows + this.pkStep;
            case 'uuid':
                return Utilities.getUuid().replace(/\-/g, '');
            default:
                return null;
        }
    }

    protected setKey(value: any, rec: any): any {
        let key: string = this.pkColumn || this.getSysId();
        rec[key] = value;
    }

    protected cleanCache() {
        if (this.useCache)
            this.cache.remove(this.getSessionId());
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
            row[this.getSysId()] = start + i;
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
                row[this.getSysId()] = start + i;
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