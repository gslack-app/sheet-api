import { IQueryAdapter } from "./interfaces";
import { ILogger } from "../core/interfaces";

export class QueryAdapter implements IQueryAdapter {
    protected spreadsheetId: string;
    protected sheet: GoogleAppsScript.Spreadsheet.Sheet;
    protected sheetName: string;
    protected logger: ILogger;
    protected headerRange: GoogleAppsScript.Spreadsheet.Range;
    protected dataColumn: Record<string, string>;

    constructor({ ILogger }: any) {
        this.logger = ILogger
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

    //#region IQueryAdapter
    init(params?: any) {
        let { name, id, headerA1 } = params;
        let ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
        this.spreadsheetId = ss.getId();
        this.sheet = ss.getSheetByName(name);
        this.sheetName = name;
        this.headerRange = headerA1 ? this.sheet.getRange(headerA1) : this.sheet.getRange(1, 1, 1, this.lastColumn);
        this.dataColumn = {};
        let headerRow = this.headerRange.getValues()[0];
        let start = this.startColumn;
        for (let i = 0, len = headerRow.length; i < len; i++) {
            let name = this.normalize(headerRow[i]);
            this.dataColumn[name] = this.columnToLetter(start + i);
        }
    }

    query(sql: string, headers: string[]): any[] {
        let dataRange = this.sheet.getRange(this.startRow, this.startColumn, this.numRows, this.numColumns);
        let csv = this.getSheetQueryResult(this.spreadsheetId, this.sheetName, dataRange.getA1Notation(), sql);
        let rows: string[][] = csv ? Utilities.parseCsv(csv) : [];
        return rows.length ? rows.slice(1).map(row => {
            let record: any = {};
            headers.forEach((header, idx) => record[header] = row[idx]);
            return record;
        }) : [];
    }

    getColumnId(column: string): string {
        return this.dataColumn[column];
    }
    //#endregion

    protected columnToLetter(column: number): string {
        let temp: number;
        let letter: string = '';

        while (column > 0) {
            temp = (column - 1) % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            column = (column - temp - 1) / 26;
        }
        return letter;
    }

    protected getSheetQueryResult(spreadsheetId: string, sheet: string, rangeA1: string, sqlText: string): string {
        let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheet}&headers=0&range=${rangeA1}&tq=${encodeURIComponent(sqlText)}`;
        this.logger.debug(url);
        let options = {
            headers: {
                Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
                contentType: "application/json"
            }
        };
        let response = UrlFetchApp.fetch(url, options);
        let content = response.getContentText();
        if (response.getResponseCode() == 200) {
            try {
                return content;
            }
            catch (e) {
                this.logger && this.logger.error(`VisualizationAdapter -> ${e.stack}`);
            }
        }
        else {
            this.logger && this.logger.error(content);
        }
        return null;
    }

    protected normalize(name: string): string {
        return name.trim();
    }
}