const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export const updateSheetCellByGid = async (
  accessToken: string,
  spreadsheetId: string,
  gid: string,
  sheetRowNumber: number,
  column: 'F' | 'H',
  driveLink: string
): Promise<void> => {
  const sheetName = await getSheetNameByGid(accessToken, spreadsheetId, gid);
  const range = `'${sheetName.replace(/'/g, "''")}'!${column}${sheetRowNumber}`;
  const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, values: [[driveLink]] }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to update Google Sheet');
  }
};

export interface SupplierMonthItem {
  date: string;
  amount: number;
  jkb: number;
  nck: number;
  sourceRow: number;
}

export interface SupplierMonthSummary {
  label: string;
  items: SupplierMonthItem[];
  amount: number;
  jkb: number;
  nck: number;
}

const SUPPLIER_TABLE_SHEET_ID = '1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM';
const SUPPLIER_TABLE_GID = 164287476;
const SUPPLIER_TABLE_YEAR = 2026;
const SUPPLIER_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const parseSupplierNumber = (value: unknown) => {
  const parsed = parseFloat(String(value ?? '').replace(/,/g, '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseSupplierDate = (value: unknown) => {
  const text = String(value ?? '').trim();
  const monthFirst = text.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+(\d{1,2})(?:[^0-9]+(20\d{2}))?/i);
  const dayFirst = text.match(/^(\d{1,2})[-/\s](JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[-/\s](20\d{2})$/i);
  if (!monthFirst && !dayFirst) return null;
  const monthText = monthFirst?.[1] || dayFirst![2];
  const month = SUPPLIER_MONTHS.indexOf(monthText.slice(0, 3).toUpperCase());
  const day = Number(monthFirst?.[2] || dayFirst![1]);
  const yearText = monthFirst?.[3] || dayFirst![3];
  const year = yearText ? Number(yearText) : SUPPLIER_TABLE_YEAR;
  return { month, day, year, sortValue: Date.UTC(year, month, day) };
};

const supplierMonthLabel = (value: unknown) => {
  const parsed = parseSupplierDate(value);
  return parsed ? `${SUPPLIER_MONTHS[parsed.month]} ${parsed.year}` : '';
};

const cutoffDateValue = (cutoffDate?: string) => {
  if (!cutoffDate) return Number.NEGATIVE_INFINITY;
  const [year, month, day] = cutoffDate.split('-').map(Number);
  return year && month && day ? Date.UTC(year, month - 1, day) : Number.NEGATIVE_INFINITY;
};

export type SupplierDateColumn = 'K' | 'O';

const fetchSupplierSheetRows = async (accessToken: string): Promise<string[][]> => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const tab = await getSheetNameByGid(accessToken, SUPPLIER_TABLE_SHEET_ID, String(SUPPLIER_TABLE_GID));
  const response = await fetch(`${SHEETS_API_BASE}/${SUPPLIER_TABLE_SHEET_ID}/values/${encodeURIComponent(`'${tab}'!A:O`)}?valueRenderOption=FORMATTED_VALUE`, { headers });
  if (!response.ok) throw new Error(`Unable to read supplier data (${response.status})`);
  return (await response.json()).values || [];
};

const fetchSupplierRows = async (accessToken: string, cutoffDate?: string, referenceDateColumn: SupplierDateColumn = 'K'): Promise<SupplierMonthItem[]> => {
  const rows = await fetchSupplierSheetRows(accessToken);
  const dateColumnIndex = referenceDateColumn === 'O' ? 14 : 10;
  return rows
    .map((row: string[], index: number) => ({ date: String(row[dateColumnIndex] || '').trim(), amount: parseSupplierNumber(row[7]), jkb: parseSupplierNumber(row[12]), nck: parseSupplierNumber(row[13]), sourceRow: index + 1 }))
    // The selected date column is authoritative. Rows with a blank or invalid reference date are excluded.
    .filter((item: SupplierMonthItem) => item.date !== '' && parseSupplierDate(item.date) !== null)
    .filter((item: SupplierMonthItem) => parseSupplierDate(item.date)!.sortValue >= cutoffDateValue(cutoffDate))
    .sort((a: SupplierMonthItem, b: SupplierMonthItem) => parseSupplierDate(a.date)!.sortValue - parseSupplierDate(b.date)!.sortValue || a.sourceRow - b.sourceRow);
};

export interface SupplierSpecialTotals {
  forCollection: { amount: number; jkb: number; nck: number };
  chinaForDr: { amount: number; jkb: number; nck: number };
}

export type SupplierSpecialKind = 'forCollection' | 'chinaForDr';

const supplierSpecialKind = (row: string[]): SupplierSpecialKind | null => {
  const h = String(row[7] || '').trim();
  const i = String(row[8] || '').trim();
  const j = String(row[9] || '').trim();
  const k = String(row[10] || '').trim();
  if (!h || k) return null;
  if (i && j) return 'forCollection';
  if (!i && !j) return 'chinaForDr';
  return null;
};

export const fetchSupplierSpecialTotals = async (accessToken: string): Promise<SupplierSpecialTotals> => {
  const rows = await fetchSupplierSheetRows(accessToken);
  const totals = {
    forCollection: { amount: 0, jkb: 0, nck: 0 },
    chinaForDr: { amount: 0, jkb: 0, nck: 0 },
  };
  rows.forEach((row) => {
    const kind = supplierSpecialKind(row);
    if (!kind) return;
    const target = totals[kind];
    target.amount += parseSupplierNumber(row[7]);
    target.jkb += parseSupplierNumber(row[12]);
    target.nck += parseSupplierNumber(row[13]);
  });
  return totals;
};

export const fetchSupplierSpecialDetails = async (accessToken: string, kind: SupplierSpecialKind): Promise<SupplierMonthSummary> => {
  const rows = await fetchSupplierSheetRows(accessToken);
  const label = kind === 'forCollection' ? 'FOR COLLECTION' : 'CHINA (for DR)';
  const items = rows.flatMap((row, index): SupplierMonthItem[] => {
    if (supplierSpecialKind(row) !== kind) return [];
    const identifier = kind === 'forCollection'
      ? [String(row[8] || '').trim(), String(row[9] || '').trim()].filter(Boolean).join(' · ')
      : String(row[2] || row[0] || `Row ${index + 1}`).trim();
    return [{
      date: identifier,
      amount: parseSupplierNumber(row[7]),
      jkb: parseSupplierNumber(row[12]),
      nck: parseSupplierNumber(row[13]),
      sourceRow: index + 1,
    }];
  });
  return items.reduce<SupplierMonthSummary>((summary, item) => {
    summary.items.push(item);
    summary.amount += item.amount;
    summary.jkb += item.jkb;
    summary.nck += item.nck;
    return summary;
  }, { label, items: [], amount: 0, jkb: 0, nck: 0 });
};

export const fetchSupplierMonthSummaries = async (accessToken: string, cutoffDate?: string, referenceDateColumn: SupplierDateColumn = 'K'): Promise<SupplierMonthSummary[]> => {
  const rows = await fetchSupplierRows(accessToken, cutoffDate, referenceDateColumn);
  const groups = new Map<string, SupplierMonthSummary>();
  rows.forEach((item) => {
    const label = supplierMonthLabel(item.date);
    const current = groups.get(label) || { label, items: [], amount: 0, jkb: 0, nck: 0 };
    current.items.push(item); current.amount += item.amount; current.jkb += item.jkb; current.nck += item.nck;
    groups.set(label, current);
  });
  return [...groups.values()].sort((a, b) => parseSupplierDate(a.items[0]?.date)!.sortValue - parseSupplierDate(b.items[0]?.date)!.sortValue);
};

export const fetchSupplierMonthDetails = async (accessToken: string, month: string, cutoffDate?: string, referenceDateColumn: SupplierDateColumn = 'K'): Promise<SupplierMonthSummary> => {
  const summaries = await fetchSupplierMonthSummaries(accessToken, cutoffDate, referenceDateColumn);
  return summaries.find((summary) => summary.label === month) || { label: month, items: [], amount: 0, jkb: 0, nck: 0 };
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
  if (!sheet?.properties?.title) throw new Error(`Sheet tab ${gid} was not found.`);
  return sheet.properties.title;
};

export const generateSOA = async (
  accessToken: string,
  spreadsheetId: string,
  selectedRowsData: any[],
  selectionType: 'DR' | 'CBM',
  options: { formatSourceDates?: boolean; secondPageRows?: any[] } = {}
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

  const buildRowsData = (sourceRows: any[], type: 'DR' | 'CBM') => {
    const output = [];
    for (let i = 0; i < 3; i++) {
      if (i < sourceRows.length) {
        const row = sourceRows[i];
        let reference = '';
        if (type === 'DR') {
          reference = (row.Remarks || '').substring(0, 6);
        } else {
          const remarks = row.Remarks || '';
          reference = remarks.length >= 6 ? remarks.substring(0, 3) + remarks.slice(-3) : remarks;
        }

        const amount = type === 'DR' ? (row.PHP || '') : (row.CBMPHP || '');
        output.push([row.Color || '', row.Description || '', reference, amount]);
      } else {
        output.push(['', '', '', '']);
      }
    }
    return output;
  };

  const rowsData = buildRowsData(selectedRowsData, selectionType);

  const data = [
    { range: `'${sheetName}'!D2`, values: [[todayIso]] },
    { range: `'${sheetName}'!B7`, values: [[b7Value]] },
    { range: `'${sheetName}'!A8:D10`, values: rowsData },
    { range: `'${sheetName}'!D11`, values: [['=SUM(D8:D10)']] }
  ];

  if (options.secondPageRows !== undefined) {
    const secondRowsData = buildRowsData(options.secondPageRows, 'CBM');
    data.push(
      { range: `'${sheetName}'!I2`, values: [[todayIso]] },
      { range: `'${sheetName}'!G7`, values: [[options.secondPageRows.length ? 'CBM' : '']] },
      { range: `'${sheetName}'!F8:I10`, values: secondRowsData },
      { range: `'${sheetName}'!I11`, values: [['=SUM(I8:I10)']] },
    );
  }

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
          ...(options.formatSourceDates ? [{
            repeatCell: {
              range: {
                sheetId: Number(soaGid),
                startRowIndex: 7,
                endRowIndex: 10,
                startColumnIndex: 0,
                endColumnIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                  numberFormat: {
                    type: 'DATE',
                    pattern: 'dd-mmm-yyyy',
                  },
                },
              },
              fields: 'userEnteredFormat.horizontalAlignment,userEnteredFormat.numberFormat',
            },
          }] : []),
          ...(options.formatSourceDates && options.secondPageRows !== undefined ? [{
            repeatCell: {
              range: {
                sheetId: Number(soaGid),
                startRowIndex: 7,
                endRowIndex: 10,
                startColumnIndex: 5,
                endColumnIndex: 6,
              },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                  numberFormat: {
                    type: 'DATE',
                    pattern: 'dd-mmm-yyyy',
                  },
                },
              },
              fields: 'userEnteredFormat.horizontalAlignment,userEnteredFormat.numberFormat',
            },
          }] : []),
        ],
      }),
    }
  );

  if (!formatResponse.ok) {
    const error = await formatResponse.json();
    throw new Error(error.error?.message || 'Failed to format SOA date cell');
  }
};
