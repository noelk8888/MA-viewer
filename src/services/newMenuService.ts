import Papa from 'papaparse';
import { getSheetNameByGid } from './googleSheetsService';

export const NEW_MENU_SHEET_ID = '1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM';
export const NEW_MENU_GID = '216870307';
export const GEN_BUY_GID = '1755470891';
export const GEN_SELL_GID = '1307953980';

export interface NewMenuRow {
  reference: string;
  date: string;
  supplier: string;
  cnyRate: string;
  sellRate: string;
  amountCny: string;
  firstImage: string;
  secondImage: string;
  cbm: string;
  cbmFactor: string;
  cbmSellPrice: string;
  sharePercent: string;
  sheetRowNumber: number;
}

export const sortNewMenuRows = <T extends Pick<NewMenuRow, 'reference' | 'sheetRowNumber'>>(rows: T[]): T[] => {
  const parts = (reference: string) => reference.trim().match(/^(\d{2})(\d+)([A-Za-z]*)$/);
  return [...rows].sort((left, right) => {
    const a = parts(left.reference);
    const b = parts(right.reference);
    if (a && b) {
      return Number(b[1]) - Number(a[1])
        || Number(a[2]) - Number(b[2])
        || a[3].localeCompare(b[3])
        || right.sheetRowNumber - left.sheetRowNumber;
    }
    if (a) return -1;
    if (b) return 1;
    return right.sheetRowNumber - left.sheetRowNumber;
  });
};

export const fetchNewMenuRows = async (): Promise<NewMenuRow[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${NEW_MENU_SHEET_ID}/export?format=csv&gid=${NEW_MENU_GID}&t=${Date.now()}`;
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(url, {
      download: true,
      header: false,
      complete: ({ data, errors }) => {
        if (errors.length) {
          reject(new Error(errors[0].message));
          return;
        }

        const rows = data.map((row, index) => ({
          reference: row[0]?.trim() || '',
          date: row[1]?.trim() || '',
          supplier: row[4]?.trim() || '',
          cnyRate: row[2]?.trim() || '',
          sellRate: row[3]?.trim() || '',
          firstImage: row[5]?.trim() || '',
          amountCny: row[6]?.trim() || '',
          secondImage: row[7]?.trim() || '',
          cbm: row[8]?.trim() || '',
          cbmFactor: row[10]?.trim() || '',
          cbmSellPrice: row[11]?.trim() || '',
          sharePercent: row[12]?.trim() || '',
          sheetRowNumber: index + 1,
        })).filter(row => {
          const isHeader = ['reference', 'ref'].includes(row.reference.toLowerCase())
            && row.date.toLowerCase() === 'date';
          return !isHeader && Boolean(row.reference || row.date || row.supplier || row.amountCny || row.firstImage || row.secondImage || row.cbm);
        });

        resolve(sortNewMenuRows(rows));
      },
      error: reject,
    });
  });
};

export const generateBuyRows = async (accessToken: string, selectedRows: NewMenuRow[]): Promise<number> => {
  if (selectedRows.length === 0) return 0;

  const numericCell = (value: string, label: string): number | '' => {
    if (!value.trim()) return '';
    const parsed = Number(value.replace(/,/g, ''));
    if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number before generating GenBUY.`);
    return parsed;
  };

  const sheetName = await getSheetNameByGid(accessToken, NEW_MENU_SHEET_ID, GEN_BUY_GID);
  const quotedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${NEW_MENU_SHEET_ID}/values`;
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const readResponse = await fetch(`${baseUrl}/${encodeURIComponent(`${quotedSheetName}!A:M`)}?valueRenderOption=FORMATTED_VALUE`, { headers });
  if (!readResponse.ok) {
    const error = await readResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Could not inspect existing GenBUY rows.');
  }
  const existing = await readResponse.json() as { values?: string[][] };
  const lastOccupiedRow = (existing.values || []).reduce((last, row, index) =>
    row.some(value => String(value).trim() !== '') ? index + 1 : last, 0);
  const firstRow = Math.max(lastOccupiedRow + 1, 3);

  const values = selectedRows.map((row, index) => {
    const destinationRow = firstRow + index;
    const amountCny = numericCell(row.amountCny, `${row.reference || 'Selected row'} CNY amount`);
    if (amountCny === '') throw new Error(`${row.reference || 'Selected row'} needs a CNY amount before generating GenBUY.`);
    return [
      row.reference, row.date, row.supplier, row.firstImage, amountCny,
      `=E${destinationRow}/0.993`,
      `=ROUND(F${destinationRow}/1000,0)*1000`,
      numericCell(row.cnyRate, `${row.reference || 'Selected row'} CNY rate`),
      `=G${destinationRow}*H${destinationRow}`,
      numericCell(row.cbm, `${row.reference || 'Selected row'} CBM`),
      numericCell(row.cbmFactor, `${row.reference || 'Selected row'} CBM factor`),
      `=J${destinationRow}*K${destinationRow}`,
    ];
  });
  const range = `${quotedSheetName}!A${firstRow}:L${firstRow + values.length - 1}`;
  const writeResponse = await fetch(`${baseUrl}/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT', headers, body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
  if (!writeResponse.ok) {
    const error = await writeResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Could not generate GenBUY rows.');
  }

  const startRowIndex = firstRow - 1;
  const endRowIndex = startRowIndex + values.length;
  const alignByColumn: Array<{ index: number; alignment: 'CENTER' | 'LEFT' | 'RIGHT' }> = [
    ...[0, 1, 7, 10, 13, 17].map(index => ({ index, alignment: 'CENTER' as const })),
    ...[2, 3, 18].map(index => ({ index, alignment: 'LEFT' as const })),
    ...[4, 5, 6, 8, 9, 11, 12, 14, 15, 19].map(index => ({ index, alignment: 'RIGHT' as const })),
  ];
  const formatResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${NEW_MENU_SHEET_ID}:batchUpdate`, {
    method: 'POST', headers, body: JSON.stringify({ requests: alignByColumn.map(({ index, alignment }) => ({ repeatCell: {
      range: { sheetId: Number(GEN_BUY_GID), startRowIndex, endRowIndex, startColumnIndex: index, endColumnIndex: index + 1 },
      cell: { userEnteredFormat: { horizontalAlignment: alignment, textFormat: { fontFamily: 'Arial', fontSize: 12 } } },
      fields: 'userEnteredFormat.horizontalAlignment,userEnteredFormat.textFormat',
    } })) }),
  });
  if (!formatResponse.ok) {
    const error = await formatResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'GenBUY rows were written, but their formatting could not be applied.');
  }
  return values.length;
};
