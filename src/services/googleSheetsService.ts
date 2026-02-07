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
