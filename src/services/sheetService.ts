import Papa from 'papaparse';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM/export?format=csv&gid=311571294';

export interface SheetRow {
    // Column 1: Supplier Info
    Supplier: string; // Col B
    Code: string; // Col O
    Description: string; // Col C
    Color: string; // Col X (Red if Y empty) - Actually mapping the raw data first
    Remarks: string; // Col Y

    // Column 2: DR
    DR: string; // Col D - Modal Content

    // Column 3: Pricing
    RMB: string; // Col E (CNY)
    PHP: string; // Col Q (PHP)
    CnyToday: string; // Col J
    CBMValue: string; // Col S
    CBMPHP: string;   // Col U

    // Column 4: CBM
    CBM: string; // Col R - Modal Content

    // Row tracking for updates
    originalIndex: number; // Actual 1-indexed row number in sheet
}

export const fetchSheetData = async (): Promise<{ rows: SheetRow[], rate: string, i1Value: string }> => {
    return new Promise((resolve, reject) => {
        // Append timestamp to URL to prevent caching and ensure fresh rate
        const freshUrl = `${SHEET_CSV_URL}&t=${new Date().getTime()}`;
        Papa.parse(freshUrl, {
            download: true,
            header: false, // We might need to handle headers manually or inspect data
            complete: (results) => {
                const data = results.data as string[][];

                // 1. Extract Rate from Row 0 (Header Row)
                // "CNY today" is usually at index 9, value at index 10
                let rate = '0';
                let i1Value = '0';
                if (data.length > 0) {
                    const row0 = data[0];
                    const cnyIndex = row0.findIndex(cell => cell.toLowerCase().includes('cny today'));
                    if (cnyIndex !== -1 && row0[cnyIndex + 1]) {
                        rate = row0[cnyIndex + 1];
                    } else {
                        // Fallback to index 10 if "CNY today" label is missing but structure matches
                        rate = row0[10] || '0';
                    }

                    // Extract I1 value (column I = index 8) and divide by 1000
                    // Remove commas from the number string before parsing
                    const i1Raw = parseFloat((row0[8] || '0').replace(/,/g, '')) || 0;
                    i1Value = (i1Raw / 1000).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                }

                // 2. Parse Rows
                // User requested to start with row 6 (index 5)
                const rows = data.slice(5).map((row, index) => ({
                    Supplier: row[1] || '',
                    Code: row[9] || '',
                    Description: row[2] || '',
                    Color: row[23] || ' ',
                    Remarks: row[24] || '',
                    DR: row[3] || '',
                    RMB: row[4] || '0',
                    PHP: row[16] || '0',
                    CnyToday: row[9] || '0',
                    CBMValue: row[18] || '',
                    CBMPHP: row[20] || '',
                    CBM: row[17] || '',
                    originalIndex: index + 6 // Data starts at row 6 (1-indexed)
                })).filter(row => row.Supplier || row.Code || row.Description);

                // User requested to sort by latest date. Assuming sheet is chronological (oldest -> newest),
                // we simply reverse the array.
                resolve({
                    rows: rows.reverse(),
                    rate,
                    i1Value
                });
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};
