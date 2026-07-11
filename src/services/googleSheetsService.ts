import Papa from 'papaparse';
import { toIsoDate } from '../utils/formatters';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export type ImageType = 'DR' | 'CBM';

// Column mapping based on sheetService.ts:
// DR = row[3] = Column D
// CBM = row[17] = Column R
const COLUMN_MAP: Record<ImageType, string> = {
  DR: 'D',
  CBM: 'R',
};

export interface UpdateResult {
  success: boolean;
  updatedRange: string;
}

export const updateSheetCell = async (
  accessToken: string,
  sheetId: string,
  sheetRowNumber: number,
  imageType: ImageType,
  driveLink: string,
  year: string = '2026'
): Promise<UpdateResult> => {
  const column = COLUMN_MAP[imageType];
  const range = `${year}!${column}${sheetRowNumber}`;

  const response = await fetch(
    `${SHEETS_API_BASE}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        values: [[driveLink]],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update Google Sheet');
  }

  const result = await response.json();
  return {
    success: true,
    updatedRange: result.updatedRange,
  };
};

// New row data interface
export interface NewRowData {
  date?: string;           // Col B
  supplier?: string;       // Col C
  amountCNY?: number;      // Col E
  sacks?: number;          // Col F
  cnyToday?: number;       // Col J
  cnyMA?: number;          // Col O
  cbm?: number;            // Col S
  drNumber?: string;       // Col Y
  dateX?: string;          // Col X
  colN?: string;           // Col N
}

export interface AppendResult {
  success: boolean;
  appendedRange: string;
}

export const appendSheetRow = async (
  accessToken: string,
  sheetId: string,
  rowData: NewRowData,
  year: string = '2026'
): Promise<AppendResult> => {
  // Step 1: Find the last row with data in column B
  const findLastRowResponse = await fetch(
    `${SHEETS_API_BASE}/${sheetId}/values/${year}!B:B`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!findLastRowResponse.ok) {
    throw new Error('Failed to read sheet data');
  }

  const lastRowData = await findLastRowResponse.json();
  const lastRow = lastRowData.values ? lastRowData.values.length : 1;
  const nextRow = lastRow + 1;

  const range = `${year}!A${nextRow}:AB${nextRow}`;

  // Build row array with values and formulas
  const rowValues = [
    '',                                    // A
    rowData.date || '',                    // B - Date
    rowData.supplier || '',                // C - Supplier
    '',                                    // D - DR image (empty)
    rowData.amountCNY || '',               // E - Amount CNY
    rowData.sacks || '',                   // F - Sacks
    '',                                    // G
    `=IF(M${nextRow}=0,"",I${nextRow}/M${nextRow})`,  // H - formula: I/M
    `=IF(OR(Q${nextRow}="",M${nextRow}=""),"",Q${nextRow}-M${nextRow})`,  // I - formula: Q-M
    rowData.cnyToday || '',                // J - CNY Today
    '',                                    // K
    '',                                    // L
    `=IF(OR(E${nextRow}="",J${nextRow}=""),"",E${nextRow}*J${nextRow})`,  // M - formula: E*J
    rowData.colN || '',                    // N
    rowData.cnyMA || '',                   // O - CNY MA
    1.05,                                  // P - constant
    `=IF(OR(E${nextRow}="",O${nextRow}=""),"",E${nextRow}*O${nextRow}*1.05)`,  // Q - formula: E*O*1.05
    '',                                    // R - CBM image (empty)
    rowData.cbm || '',                     // S - CBM
    10500,                                 // T - constant
    `=IF(S${nextRow}="","",S${nextRow}*10500)`,  // U - formula: S*10500
    `=IF(B${nextRow}="","",B${nextRow}+5)`,  // V - Date + 5 days
    30,                                    // W - constant
    `=IF(V${nextRow}="","",V${nextRow}+30)`,  // X - V + 30 days
    rowData.drNumber || '',                // Y - DR Number
    `=S${nextRow}`,                        // Z - copies from S (CBM)
    9500,                                  // AA - constant
    `=IF(Z${nextRow}="","",Z${nextRow}*9500)`,  // AB - formula: Z*9500
  ];

  const response = await fetch(
    `${SHEETS_API_BASE}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        values: [rowValues],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add row to Google Sheet');
  }

  const result = await response.json();
  return {
    success: true,
    appendedRange: result.updates?.updatedRange || 'Unknown',
  };
};

// Fetch row data for editing
export interface RowDataForEdit {
  date: string;
  supplier: string;
  amountCNY: string;
  sacks: string;
  cnyToday: string;
  cnyMA: string;
  cbm: string;
  drNumber: string;
  dateX: string;
  colN: string;
}

export const fetchRowForEdit = async (
  accessToken: string,
  sheetId: string,
  rowNumber: number,
  year: string = '2026'
): Promise<RowDataForEdit> => {
  const range = `${year}!A${rowNumber}:Y${rowNumber}`;

  const response = await fetch(
    `${SHEETS_API_BASE}/${sheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Fetch row error:', errorData);
    throw new Error(errorData.error?.message || 'Failed to fetch row data');
  }

  const result = await response.json();
  const row = result.values?.[0] || [];

  // Helper to safely get value from array
  const getValue = (index: number): string => {
    const val = row[index];
    if (val === undefined || val === null) return '';
    return String(val);
  };

  return {
    date: toIsoDate(getValue(1)),
    supplier: getValue(2),       // C
    amountCNY: getValue(4),      // E
    sacks: getValue(5),          // F
    cnyToday: getValue(9),       // J
    cnyMA: getValue(14),         // O
    cbm: getValue(18),           // S
    drNumber: getValue(24),      // Y
    dateX: toIsoDate(getValue(23)), // X
    colN: getValue(13),          // N (Column 14)
  };
};

// Update existing row
export const updateSheetRow = async (
  accessToken: string,
  sheetId: string,
  rowNumber: number,
  rowData: NewRowData,
  year: string = '2026'
): Promise<UpdateResult> => {
  const range = `${year}!A${rowNumber}:AB${rowNumber}`;

  // Build row array with values and formulas (same structure as append)
  const rowValues = [
    '',                                    // A
    rowData.date || '',                    // B - Date
    rowData.supplier || '',                // C - Supplier
    '',                                    // D - DR image (preserve)
    rowData.amountCNY || '',               // E - Amount CNY
    rowData.sacks || '',                   // F - Sacks
    '',                                    // G
    `=IF(M${rowNumber}=0,"",I${rowNumber}/M${rowNumber})`,  // H
    `=IF(OR(Q${rowNumber}="",M${rowNumber}=""),"",Q${rowNumber}-M${rowNumber})`,  // I
    rowData.cnyToday || '',                // J - CNY Today
    '',                                    // K
    '',                                    // L
    `=IF(OR(E${rowNumber}="",J${rowNumber}=""),"",E${rowNumber}*J${rowNumber})`,  // M
    rowData.colN || '',                    // N
    rowData.cnyMA || '',                   // O - CNY MA
    1.05,                                  // P
    `=IF(OR(E${rowNumber}="",O${rowNumber}=""),"",E${rowNumber}*O${rowNumber}*1.05)`,  // Q
    '',                                    // R - CBM image (preserve)
    rowData.cbm || '',                     // S - CBM
    10500,                                 // T
    `=IF(S${rowNumber}="","",S${rowNumber}*10500)`,  // U
    `=IF(B${rowNumber}="","",B${rowNumber}+5)`,  // V
    30,                                    // W
    rowData.dateX || `=IF(V${rowNumber}="","",V${rowNumber}+30)`,  // X
    rowData.drNumber || '',                // Y - DR Number
    `=S${rowNumber}`,                      // Z
    9500,                                  // AA
    `=IF(Z${rowNumber}="","",Z${rowNumber}*9500)`,  // AB
  ];

  const existingRange = `${year}!D${rowNumber}:R${rowNumber}`;
  const existingResponse = await fetch(
    `${SHEETS_API_BASE}/${sheetId}/values/${encodeURIComponent(existingRange)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (existingResponse.ok) {
    const existingData = await existingResponse.json();
    const existingRow = existingData.values?.[0] || [];
    // D is index 0, R is index 14 in this range
    rowValues[3] = existingRow[0] || '';  // Preserve DR image
    rowValues[17] = existingRow[14] || ''; // Preserve CBM image
  }

  const response = await fetch(
    `${SHEETS_API_BASE}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        values: [rowValues],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update row');
  }

  const result = await response.json();
  return {
    success: true,
    updatedRange: result.updatedRange || range,
  };
};

export interface SummaryItem {
  label: string;
  j2n: number;
  jkb: number;
  nck: number;
  monthIndex?: number;
}

export interface SummaryData {
  items: SummaryItem[];
  dr: SummaryItem;
  china: SummaryItem;
  total: SummaryItem;
  jkbValue: string;
}

export interface AccountItem {
  label: string;
  sm: number;
  marlon: number;
  marilu: number;
  total: number;
}

export interface AccountData {
  items: AccountItem[];
  total: AccountItem;
}

const parseAccountValue = (value: unknown) => {
  const number = parseFloat(String(value ?? '').replace(/,/g, '').replace(/\s/g, ''));
  return Number.isFinite(number) ? number : 0;
};

export const fetchAccountData = async (accessToken: string): Promise<AccountData> => {
  const months = ['JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const firstSheetId = '1yMce9uSYxzUZxJTcxg1_UtlSsOut50rXeoVYtbA-q-8';
  const marlonSheetId = '1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM';

  const headers = { Authorization: `Bearer ${accessToken}` };
  const getTabTitle = async (spreadsheetId: string, gid: number) => {
    const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties`, { headers });
    if (!response.ok) throw new Error(`Unable to access Google Sheet (${response.status})`);
    const result = await response.json();
    const sheet = result.sheets?.find((entry: any) => entry.properties?.sheetId === gid);
    if (!sheet) throw new Error(`Google Sheet tab ${gid} was not found`);
    return sheet.properties.title.replace(/'/g, "''");
  };
  const getValues = async (spreadsheetId: string, tab: string, range: string) => {
    const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(`'${tab}'!${range}`)}?valueRenderOption=UNFORMATTED_VALUE`, { headers });
    if (!response.ok) throw new Error(`Unable to read account values (${response.status})`);
    return (await response.json()).values || [];
  };
  const [firstTab, marlonTab] = await Promise.all([
    getTabTitle(firstSheetId, 50440179), getTabTitle(marlonSheetId, 213812473),
  ]);
  const [firstRows, marlonRows] = await Promise.all([
    getValues(firstSheetId, firstTab, 'N50:X51'),
    getValues(marlonSheetId, marlonTab, 'S55:S94'),
  ]);
  const items = months.map((label, index) => {
    const sourceColumn = index * 2;
    const sm = parseAccountValue(firstRows[0]?.[sourceColumn]);
    const marilu = parseAccountValue(firstRows[1]?.[sourceColumn]);
    const marlon = index === 5
      ? 2946856
      : marlonRows.slice(index * 8, index * 8 + 8)
        .reduce((sum: number, row: string[]) => sum + parseAccountValue(row?.[0]), 0);
    return { label, sm, marlon, marilu, total: sm + marlon + marilu };
  });
  const total = items.reduce((sum, item) => ({
    label: 'TOTAL', sm: sum.sm + item.sm, marlon: sum.marlon + item.marlon,
    marilu: sum.marilu + item.marilu, total: sum.total + item.total,
  }), { label: 'TOTAL', sm: 0, marlon: 0, marilu: 0, total: 0 });
  return { items, total };
};

export const fetchSummaryData = async (
  sheetId: string
): Promise<SummaryData> => {
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=213812473&t=${new Date().getTime()}`;
  
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: false,
        complete: (results) => {
          try {
            const data = results.data as string[][];
            
            const getCell = (row: number, col: 'B' | 'C' | 'D' | 'F' | 'M' | 'N' | 'O' | 'R' | 'S' | 'T' | 'U'): string => {
              const r = data[row - 1]; 
              if (!r) return '';
              if (col === 'B') return r[1] || '';
              if (col === 'C') return r[2] || '';
              if (col === 'D') return r[3] || '';
              if (col === 'F') return r[5] || '';
              if (col === 'M') return r[12] || '';
              if (col === 'N') return r[13] || '';
              if (col === 'O') return r[14] || '';
              if (col === 'R') return r[17] || '';
              if (col === 'S') return r[18] || '';
              if (col === 'T') return r[19] || '';
              if (col === 'U') return r[20] || '';
              return '';
            };

            const parseVal = (str: string) => parseFloat(str.replace(/,/g, '')) || 0;

            const currentMonthIndex = new Date().getMonth(); // 0-11
            const items: SummaryItem[] = [];

            let totalJ2N = 0;
            let totalJKB = 0;
            let totalNCK = 0;

            for (let count = 0; count < 12; count++) {
              const i = (currentMonthIndex + count) % 12;
              const startRow = 7 + (i * 8);
              const endRow = 14 + (i * 8);
              
              let j2n = 0;
              let jkb = 0;
              let nck = 0;

              for (let r = startRow; r <= endRow; r++) {
                j2n += parseVal(getCell(r, 'S'));
                jkb += parseVal(getCell(r, 'T'));
                nck += parseVal(getCell(r, 'U'));
              }
              
              const label = getCell(endRow, 'C') || ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][i];
              
              if (j2n !== 0 || jkb !== 0 || nck !== 0) {
                items.push({ label, j2n, jkb, nck, monthIndex: i });
                totalJ2N += j2n;
                totalJKB += jkb;
                totalNCK += nck;
              }
            }

            const drJ2N = parseVal(getCell(106, 'S'));
            const drJKB = parseVal(getCell(106, 'T'));
            const drNCK = parseVal(getCell(106, 'U'));
            const dr: SummaryItem = { label: 'DR', j2n: drJ2N, jkb: drJKB, nck: drNCK };
            totalJ2N += drJ2N; totalJKB += drJKB; totalNCK += drNCK;

            const chinaJ2N = parseVal(getCell(154, 'S'));
            const chinaJKB = parseVal(getCell(154, 'T'));
            const chinaNCK = parseVal(getCell(154, 'U'));
            const china: SummaryItem = { label: 'CHINA', j2n: chinaJ2N, jkb: chinaJKB, nck: chinaNCK };
            totalJ2N += chinaJ2N; totalJKB += chinaJKB; totalNCK += chinaNCK;

            const total: SummaryItem = { label: 'TOTAL', j2n: totalJ2N, jkb: totalJKB, nck: totalNCK };

            const jkbValueRaw = getCell(3, 'R');
            const jkbValue = jkbValueRaw ? jkbValueRaw.split('\n')[0].trim() : '';

            resolve({ items, dr, china, total, jkbValue });
          } catch (err: any) {
            reject(new Error('Parse logic error: ' + err.message));
          }
        },
        error: (error: any) => {
          reject(new Error('CSV parse error: ' + error.message));
        }
      });
    });
  } catch (err: any) {
    throw new Error('Fetch failed: ' + err.message);
  }
};

export interface MonthDetailItem {
  date: string;
  j2n: number;
  jkb: number;
  nck: number;
  sourceRow: number;
  details?: string;
  drNum?: string;
}

export interface MonthDetailData {
  label: string;
  items: MonthDetailItem[];
  total: Pick<MonthDetailItem, 'j2n' | 'jkb' | 'nck'>;
}

export const fetchMonthDetailData = async (
  sheetId: string,
  monthIndex: number,
  monthLabel: string
): Promise<MonthDetailData> => {
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=213812473&t=${new Date().getTime()}`;
  const response = await fetch(CSV_URL);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: false,
      complete: (results) => {
        try {
          const data = results.data as string[][];
          const parseVal = (value: string) => parseFloat(String(value || '').replace(/,/g, '')) || 0;
          const items: MonthDetailItem[] = [];

          if (monthLabel === 'DR') {
            for (let row = 110; row <= 130; row++) {
              if (row > data.length) break;
              const source = data[row - 1] || [];
              const date = source[5] || '';       // F
              const details = source[7] || '';    // H
              const drNum = source[9] || '';      // J
              const amount = (
                parseVal(source[11]) + // L
                parseVal(source[13]) + // N
                parseVal(source[15])   // P
              );

              if (!date && !details && !drNum && amount === 0) continue; // Skip blank rows

              items.push({ date, details, drNum, j2n: 0, jkb: 0, nck: amount, sourceRow: row });
            }
          } else if (monthLabel === 'CHINA') {
            for (let row = 158; row <= 190; row++) {
              if (row > data.length) break;

              const source = data[row - 1] || [];
              const details = source[7] || '';     // H
              const j2n = parseVal(source[13]);    // N
              const isCbmRow = details.trim().toUpperCase() === 'CBM';

              // Each item row is paired with the immediately following CBM row.
              // Display both values on the item row and omit the separate CBM row.
              if (isCbmRow) continue;

              const partnerSource = data[row] || [];
              const partnerDetails = partnerSource[7] || ''; // H on the next row
              const hasCbmPartner = partnerDetails.trim().toUpperCase() === 'CBM';
              const jkb = hasCbmPartner
                ? parseVal(partnerSource[15])       // P on the paired CBM row
                : parseVal(source[15]);             // P fallback on the item row
              const nck = 0;
              
              if (!details && j2n === 0 && jkb === 0) {
                // Skip blank rows
                continue;
              }

              items.push({ date: '', details, j2n, jkb, nck, sourceRow: row });

              if (hasCbmPartner) row++;
            }
          } else {
            const startRow = 7 + (monthIndex * 8);
            const endRow = 14 + (monthIndex * 8);

            for (let row = startRow; row <= endRow; row++) {
              const source = data[row - 1] || [];
              const j2n = parseVal(source[18]);   // S
              const jkb = parseVal(source[19]);   // T
              const nck = parseVal(source[20]);   // U
              const date = source[5] || '';        // F (check date)

              if (date || j2n !== 0 || jkb !== 0 || nck !== 0) {
                items.push({ date, j2n, jkb, nck, sourceRow: row });
              }
            }
          }

          const total = items.reduce<Pick<MonthDetailItem, 'j2n' | 'jkb' | 'nck'>>((sum, item) => ({
            j2n: sum.j2n + item.j2n,
            jkb: sum.jkb + item.jkb,
            nck: sum.nck + item.nck,
          }), {
            j2n: 0, jkb: 0, nck: 0,
          });

          resolve({ label: monthLabel, items, total });
        } catch (err: any) {
          reject(new Error('Parse logic error: ' + err.message));
        }
      },
      error: (error: any) => reject(new Error('CSV parse error: ' + error.message)),
    });
  });
};

export const fetchK2Value = async (
  sheetId: string
): Promise<string> => {
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=976817616&t=${new Date().getTime()}`;
  
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: false,
        complete: (results) => {
          try {
            const data = results.data as string[][];
            // Row 2 is index 1, Column K is index 10
            const k2Value = data[1]?.[10] || '';
            resolve(k2Value);
          } catch (err: any) {
            reject(new Error('Parse logic error: ' + err.message));
          }
        },
        error: (error: any) => {
          reject(new Error('CSV parse error: ' + error.message));
        }
      });
    });
  } catch (err: any) {
    throw new Error('Fetch failed: ' + err.message);
  }
};

export const getSheetNameByGid = async (
  accessToken: string,
  spreadsheetId: string,
  gid: string
): Promise<string> => {
  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Your Google session has expired. Please refresh the page or sign out and sign in again.');
    }
    const errObj = await response.json().catch(() => ({}));
    throw new Error(`Failed to fetch sheet properties: ${response.status} ${errObj.error?.message || ''}`);
  }

  const data = await response.json();
  const sheet = data.sheets?.find((s: any) => s.properties?.sheetId === Number(gid));
  return sheet?.properties?.title || 'Sheet1';
};

export const generateSOA = async (
  accessToken: string,
  spreadsheetId: string,
  selectedRowsData: any[],
  selectionType: 'DR' | 'CBM'
): Promise<void> => {
  const soaGid = '1049592506';
  const sheetName = await getSheetNameByGid(accessToken, spreadsheetId, soaGid);

  const todayIso = new Date().toISOString().slice(0, 10);
  
  let b7Value = '';
  if (selectionType === 'DR') {
    const hasInterest = selectedRowsData.length > 0 && selectedRowsData[0].Description?.toLowerCase().includes('interest');
    b7Value = hasInterest ? 'INTEREST' : 'ITEMS';
  } else if (selectionType === 'CBM') {
    b7Value = 'CBM';
  }

  const rowsData = [];
  for (let i = 0; i < 3; i++) {
    if (i < selectedRowsData.length) {
      const row = selectedRowsData[i];
      let c8Value = '';
      if (selectionType === 'DR') {
        c8Value = (row.Remarks || '').substring(0, 6);
      } else {
        const remarks = row.Remarks || '';
        c8Value = remarks.length >= 6 ? remarks.substring(0, 3) + remarks.slice(-3) : remarks;
      }

      const d8Value = selectionType === 'DR' ? (row.PHP || '') : (row.CBMPHP || '');

      rowsData.push([row.Color || '', row.Description || '', c8Value, d8Value]);
    } else {
      rowsData.push(['', '', '', '']);
    }
  }

  const data = [
    { range: `'${sheetName}'!D2`, values: [[todayIso]] },
    { range: `'${sheetName}'!B7`, values: [[b7Value]] },
    { range: `'${sheetName}'!A8:D10`, values: rowsData },
    { range: `'${sheetName}'!D11`, values: [['=SUM(D8:D10)']] }
  ];

  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update SOA sheet');
  }

  const formatResponse = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: Number(soaGid),
                startRowIndex: 1,
                endRowIndex: 2,
                startColumnIndex: 3,
                endColumnIndex: 4,
              },
              cell: {
                userEnteredFormat: {
                  numberFormat: {
                    type: 'DATE',
                    pattern: 'dd-mmm-yyyy',
                  },
                },
              },
              fields: 'userEnteredFormat.numberFormat',
            },
          },
        ],
      }),
    }
  );

  if (!formatResponse.ok) {
    const error = await formatResponse.json();
    throw new Error(error.error?.message || 'Failed to format SOA date cell');
  }
};

export const generateBill = async (
  accessToken: string,
  spreadsheetId: string,
  selectedRowsData: any[],
  year: string = '2026'
): Promise<void> => {
  if (selectedRowsData.length === 0) return;

  // 1. Fetch raw data for the selected rows from the source sheet
  const rangesQuery = selectedRowsData
    .map(r => `ranges=${year}!A${r.originalIndex}:V${r.originalIndex}`)
    .join('&');

  const fetchResponse = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values:batchGet?${rangesQuery}&valueRenderOption=FORMATTED_VALUE`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!fetchResponse.ok) {
    const error = await fetchResponse.json();
    throw new Error(error.error?.message || 'Failed to fetch raw row data for billing');
  }

  const rawDataResult = await fetchResponse.json();
  const valueRanges = rawDataResult.valueRanges || [];

  // 2. Prepare target data arrays
  const rows10To12 = [];
  const rows13To15 = [];

  for (let i = 0; i < 3; i++) {
    if (i < selectedRowsData.length) {
      const rawRow = valueRanges[i]?.values?.[0] || [];
      const rowData = selectedRowsData[i];
      const getCell = (idx: number) => rawRow[idx] ? String(rawRow[idx]) : '';
      
      const colB = getCell(1);  // Date
      const colC = getCell(2);  // Supplier
      
      const colD = rowData.DR || ''; // DR Image raw link
      
      const colE = getCell(4);  // Amount CNY
      
      const colR = rowData.CBM || ''; // CBM Image raw link
      
      const colS = getCell(18); // CBM Value
      const colV = getCell(21); // Date + 5
      
      rows10To12.push([colB, colC, colD, '', colE]);
      
      // Target E formula: =F13*G13, =F14*G14, =F15*G15
      const targetRow = 13 + i;
      rows13To15.push([colV, colC, colR, `=F${targetRow}*G${targetRow}`, colS]);
    } else {
      rows10To12.push(['', '', '', '', '']);
      rows13To15.push(['', '', '', '', '']);
    }
  }

  // 3. Update the target BILL sheet
  const billGid = '837323267';
  const targetSheetName = await getSheetNameByGid(accessToken, spreadsheetId, billGid);

  const data = [
    { range: `'${targetSheetName}'!B10:F12`, values: rows10To12 },
    { range: `'${targetSheetName}'!B13:F15`, values: rows13To15 }
  ];

  const updateResponse = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    }
  );

  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    throw new Error(error.error?.message || 'Failed to push data to the BILL sheet');
  }
};
