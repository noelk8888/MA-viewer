import Papa from 'papaparse';

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

  // Parse date - handle serial date number
  let dateValue = getValue(1);
  if (dateValue) {
    const num = parseFloat(dateValue);
    // Serial date for 2020-2030 range is roughly 43831-47848
    if (!isNaN(num) && num > 40000 && num < 60000) {
      // Excel/Sheets serial date - convert to JS date
      // Sheets uses 1899-12-30 as epoch (day 0)
      const date = new Date((num - 25569) * 86400 * 1000);
      dateValue = date.toISOString().split('T')[0];
    } else if (typeof row[1] === 'string' && dateValue.includes('/')) {
      // Format like "1/15/2026" - convert to YYYY-MM-DD
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        dateValue = `${year}-${month}-${day}`;
      }
    }
  }

  return {
    date: dateValue,
    supplier: getValue(2),       // C
    amountCNY: getValue(4),      // E
    sacks: getValue(5),          // F
    cnyToday: getValue(9),       // J
    cnyMA: getValue(14),         // O
    cbm: getValue(18),           // S
    drNumber: getValue(24),      // Y
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
    `=IF(V${rowNumber}="","",V${rowNumber}+30)`,  // X
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
  value: number;
}

export interface SummaryData {
  items: SummaryItem[];
  delivered: number;
  notYetDelivered: number;
  total: number;
}

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
            
            const getCell = (row: number, col: 'B' | 'C'): string => {
              const r = data[row - 1]; // row 14 is index 13
              if (!r) return '';
              return col === 'B' ? (r[1] || '') : (r[2] || '');
            };

            const currentMonthIndex = new Date().getMonth(); // 0-11
            const items: SummaryItem[] = [];

            for (let count = 0; count < 12; count++) {
              const i = (currentMonthIndex + count) % 12;
              const row = 14 + (i * 8);
              const valStr = getCell(row, 'B').replace(/,/g, '');
              const label = getCell(row, 'C');
              
              const numVal = parseFloat(valStr);
              if (!isNaN(numVal) && numVal !== 0) {
                items.push({
                  label: label,
                  value: numVal
                });
              }
            }

            const deliveredStr = getCell(106, 'B').replace(/,/g, '');
            const deliveredVal = parseFloat(deliveredStr) || 0;
            
            const notYetStr = getCell(154, 'B').replace(/,/g, '');
            const notYetDeliveredVal = parseFloat(notYetStr) || 0;

            const total = items.reduce((sum, item) => sum + item.value, 0) + deliveredVal + notYetDeliveredVal;

            resolve({ items, delivered: deliveredVal, notYetDelivered: notYetDeliveredVal, total });
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
    throw new Error('Failed to fetch sheet properties');
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

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
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
        c8Value = (row.Remarks || '').substring(0, 5);
      } else {
        const remarks = row.Remarks || '';
        c8Value = remarks.length >= 5 ? remarks.substring(0, 2) + remarks.slice(-3) : remarks;
      }

      const d8Value = selectionType === 'DR' ? (row.PHP || '') : (row.CBMPHP || '');

      rowsData.push([row.Color || '', row.Description || '', c8Value, d8Value]);
    } else {
      rowsData.push(['', '', '', '']);
    }
  }

  const data = [
    { range: `'${sheetName}'!D2`, values: [[dateStr]] },
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
};

