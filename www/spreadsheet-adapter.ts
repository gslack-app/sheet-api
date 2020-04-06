export class SpreadsheetAdapter {
    public static readonly sysId: string = '_id_';
    protected sheet: GoogleAppsScript.Spreadsheet.Sheet;
    protected sheetName: string;
    protected spreadsheetId: string;
    protected header: string[];
    protected headerRange: GoogleAppsScript.Spreadsheet.Range;

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

    select(offset?: number, limit?: number): any[] {
        let numRowsOfHeader = this.headerRange.getLastRow() - this.headerRange.getRow() + 1;
        offset = offset ? offset * 1 + numRowsOfHeader : this.startRow;
        limit = limit ? limit * 1 : this.numRows;
        limit = limit < this.numRows ? limit : this.numRows;
        let range = this.sheet.getRange(offset, this.startColumn, limit, this.numColumns);
        let data = range.getValues();
        let rows: any[] = [];

        for (let i = 0; i < limit; i++) {
            let dataRow: Record<string, any> = {};
            dataRow[SpreadsheetAdapter.sysId] = offset + i;
            for (let j = 0; j < this.header.length; j++) {
                let colName = this.header[j];
                dataRow[colName] = data[i][j];
            }
            rows.push(dataRow);
        }
        return rows;
    }

    selectWhere(where: (rec: any) => boolean, start?: number, size?: number): any[] {
        let records = this.select(start, size);
        return records.filter(where);
    }

    insert(record: any): any {
        let rowId = this.lastRow + 1;
        delete record[SpreadsheetAdapter.sysId];
        let arr = this.valuesToArray(record);
        this.sheet.getRange(rowId, this.startColumn, 1, arr.length).setValues([arr]);
        record[SpreadsheetAdapter.sysId] = rowId;
        return record;
    }

    insertBatch(records: any[]): any[] {
        let targets: any[][] = [];
        let start = this.lastRow + 1;
        records.forEach(record => {
            let rowId = this.lastRow + 1;
            let item = this.valuesToArray(record);
            record[SpreadsheetAdapter.sysId] = rowId;
            targets.push(item);
        });
        this.sheet.getRange(start, this.startColumn, records.length, this.numColumns).setValues(targets);
        return records;
    }

    update(record: any): void {
        let rowId = record[SpreadsheetAdapter.sysId];
        if (rowId) {
            let item = this.valuesToArray(record);
            this.sheet.getRange(rowId, this.startColumn, 1, item.length).setValues([item]);
        }
    }

    updateBatch(records: any[]): void {
        records.forEach(record => {
            this.update(record);
        });
    }

    delete(rowId: number): void {
        this.sheet.deleteRow(rowId);
    }

    deleteBatch(ids: number[]): void {
        ids.forEach(id => {
            this.delete(id);
        });
    }

    getEmptyRow(def: any): any {
        let dataRow: Record<string, any> = {};
        for (let j = 0; j < this.header.length; j++) {
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

    protected valuesToArray(obj: any): any[] {
        return this.header.map(col => obj[col] ? obj[col] : '');
    }

    protected normalize(name: string): string {
        return name.replace(/[^\w_$]/, '_');
    }
}