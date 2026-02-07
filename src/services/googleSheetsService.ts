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
  driveLink: string
): Promise<UpdateResult> => {
  const column = COLUMN_MAP[imageType];
  // Use the "2026" sheet tab
  const range = `2026!${column}${sheetRowNumber}`;

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
}

export interface AppendResult {
  success: boolean;
  appendedRange: string;
}

export const appendSheetRow = async (
  accessToken: string,
  sheetId: string,
  rowData: NewRowData
): Promise<AppendResult> => {
  // Step 1: Find the last row with data in column B
  const findLastRowResponse = await fetch(
    `${SHEETS_API_BASE}/${sheetId}/values/2026!B:B`,
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

  // Step 2: Write to the specific next row
  const range = `2026!A${nextRow}:AB${nextRow}`;

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
    '',                                    // N
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
}

export const fetchRowForEdit = async (
  accessToken: string,
  sheetId: string,
  rowNumber: number
): Promise<RowDataForEdit> => {
  // Fetch columns A through Y for the specific row
  // Use UNFORMATTED_VALUE to get raw values (numbers instead of formatted strings)
  const range = `2026!A${rowNumber}:Y${rowNumber}`;

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
  };
};

// Update existing row
export const updateSheetRow = async (
  accessToken: string,
  sheetId: string,
  rowNumber: number,
  rowData: NewRowData
): Promise<UpdateResult> => {
  const range = `2026!A${rowNumber}:AB${rowNumber}`;

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
    '',                                    // N
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

  // First, get existing DR and CBM image values to preserve them
  const existingRange = `2026!D${rowNumber}:R${rowNumber}`;
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
