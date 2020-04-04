export class SpreadsheetAdapter {
    public static readonly sysId: string = '_id_';
    protected sheet: GoogleAppsScript.Spreadsheet.Sheet;
    protected sheetName: string;
    protected spreadsheetId: string;
    protected header: string[];
    protected headerRange: GoogleAppsScript.Spreadsheet.Range;

    constructor(name: string, id?: string, headerA1Notation?: string) {
        this.sheetName = name;
        this.sheet = id
            ? SpreadsheetApp.openById(id).getSheetByName(name)
            : SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
        this.spreadsheetId = this.sheet.getParent().getId();
        this.headerRange = headerA1Notation
            ? this.sheet.getRange(headerA1Notation)
            : this.sheet.getRange(1, 1, 1, this.lastColumn);
        this.header = this.headerRange.getValues()[0];
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

    get cacheId(): string {
        return `${this.spreadsheetId}.${this.sheetName}`;
    }

    select(start?: number, size?: number): any[] {
        let numRowsOfHeader = this.headerRange.getLastRow() - this.headerRange.getRow() + 1;
        start = (start + numRowsOfHeader) || this.startRow;
        size = size || this.numRows;
        let range = this.sheet.getRange(start, this.startColumn, size, this.numColumns);
        let data = range.getValues();
        let rows: any[] = [];

        for (let i = 0; i < size; i++) {
            let dataRow: Record<string, any> = {};
            dataRow[SpreadsheetAdapter.sysId] = this.startRow + i;
            for (let j = 0; j < this.header.length; j++) {
                let colName = this.header[j];
                dataRow[colName] = data[i][j];
            }
            rows.push(dataRow);
        }
        return rows;
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

    delete(rowId: number): void {
        this.sheet.deleteRow(rowId);
    }

    update(record: any): void {
        let rowId = record[SpreadsheetAdapter.sysId];
        if (rowId) {
            let item = this.valuesToArray(record);
            this.sheet.getRange(rowId, this.startColumn, 1, item.length).setValues([item]);
        }
    }

    getEmptyRow(def: any): any {
        let dataRow: Record<string, any> = {};
        for (let j = 0; j < this.header.length; j++) {
            let colName = this.header[j];
            dataRow[colName] = def || null;
        }
        return dataRow;
    }

    protected valuesToArray(obj: any): any[] {
        return this.header.map(col => obj[col] ? obj[col] : '');
    }
}