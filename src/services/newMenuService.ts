import Papa from 'papaparse';
import { getSheetNameByGid } from './googleSheetsService';

export const NEW_MENU_SHEET_ID = '1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM';
export const NEW_MENU_GID = '216870307';
export const GEN_BUY_GID = '1755470891';
export const GEN_SELL_GID = '1307953980';
export const BUY_GID = '979211971';
export const SELL_GID = '164287476';

export interface NewSeriesHeader {
  rate: string;
  total: string;
}

export interface NewMenuInput {
  reference: string;
  date: string;
  cnyRate: string;
  marketRate: string;
  supplier: string;
  itemLink: string;
  cnyAmount: string;
  cbmLink: string;
  volume: string;
  cbmA: string;
  cbmB: string;
  share: string;
}

export const fetchNewSeriesHeader = async (): Promise<NewSeriesHeader> => {
  const url = `https://docs.google.com/spreadsheets/d/${NEW_MENU_SHEET_ID}/export?format=csv&gid=${BUY_GID}&range=D1:H1&t=${Date.now()}`;
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(url, {
      download: true,
      header: false,
      complete: ({ data, errors }) => {
        if (errors.length) {
          reject(new Error(errors[0].message));
          return;
        }
        const row = data[0] || [];
        resolve({ total: String(row[0] || '0'), rate: String(row[4] || '') });
      },
      error: () => reject(new Error('Could not load BUY header values.')),
    });
  });
};

const optionalNumber = (value: string, label: string): number | '' => {
  if (!value.trim()) return '';
  const parsed = Number(value.replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be numeric.`);
  return parsed;
};

const sheetDate = (value: string): string => {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value.trim();
};

const shareValue = (value: string): number | '' => {
  if (!value.trim()) return '';
  const parsed = Number(value.replace(/%/g, '').replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) throw new Error('SHARE must be numeric.');
  return parsed / 100;
};

export const appendNewMenuRow = async (accessToken: string, input: NewMenuInput): Promise<number> => {
  const sheetName = await getSheetNameByGid(accessToken, NEW_MENU_SHEET_ID, NEW_MENU_GID);
  const quotedName = `'${sheetName.replace(/'/g, "''")}'`;
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const valuesBase = `https://sheets.googleapis.com/v4/spreadsheets/${NEW_MENU_SHEET_ID}/values`;
  const readRange = `${quotedName}!A:M`;
  const readResponse = await fetch(`${valuesBase}/${encodeURIComponent(readRange)}?valueRenderOption=FORMULA`, { headers });
  if (!readResponse.ok) {
    const error = await readResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Could not inspect NEW 2026 rows.');
  }
  const existing = await readResponse.json() as { values?: unknown[][] };
  const lastOccupiedRow = (existing.values || []).reduce((last, row, index) =>
    row.some(value => String(value ?? '').trim() !== '') ? index + 1 : last, 0);
  const sourceRow = Math.max(lastOccupiedRow, 1);
  const targetRow = sourceRow + 2;

  const formatRange = `${quotedName}!A${sourceRow}:M${sourceRow}`;
  const formatFields = 'sheets(data(rowData(values(userEnteredFormat,dataValidation))))';
  const formatResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${NEW_MENU_SHEET_ID}?includeGridData=true&ranges=${encodeURIComponent(formatRange)}&fields=${encodeURIComponent(formatFields)}`, { headers });
  if (!formatResponse.ok) {
    const error = await formatResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Could not read NEW 2026 cell formatting.');
  }
  const formatData = await formatResponse.json() as any;
  const sourceCells: any[] = formatData.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values || [];
  const formattedCells = Array.from({ length: 13 }, (_, index) => {
    const sourceCell = sourceCells[index] || {};
    const userEnteredFormat = structuredClone(sourceCell.userEnteredFormat || {});
    if (userEnteredFormat.textFormat?.link) delete userEnteredFormat.textFormat.link;
    return {
      userEnteredFormat,
      ...(sourceCell.dataValidation ? { dataValidation: sourceCell.dataValidation } : {}),
    };
  });

  const formatWriteResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${NEW_MENU_SHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requests: [{ updateCells: {
      range: { sheetId: Number(NEW_MENU_GID), startRowIndex: targetRow - 1, endRowIndex: targetRow, startColumnIndex: 0, endColumnIndex: 13 },
      rows: [{ values: formattedCells }],
      fields: 'userEnteredFormat,dataValidation',
    } }] }),
  });
  if (!formatWriteResponse.ok) {
    const error = await formatWriteResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Could not apply NEW 2026 cell formatting.');
  }

  const values: Array<string | number> = [
    input.reference.trim(),
    sheetDate(input.date),
    optionalNumber(input.cnyRate, 'CNY'),
    optionalNumber(input.marketRate, 'MRATE'),
    input.supplier.trim(),
    input.itemLink.trim(),
    optionalNumber(input.cnyAmount, 'CNY AMT'),
    input.cbmLink.trim(),
    optionalNumber(input.volume, 'VOL'),
    '',
    optionalNumber(input.cbmA, 'CBM A'),
    optionalNumber(input.cbmB, 'CBM B'),
    shareValue(input.share),
  ];
  const targetRange = `${quotedName}!A${targetRow}:M${targetRow}`;
  const writeResponse = await fetch(`${valuesBase}/${encodeURIComponent(targetRange)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ range: targetRange, majorDimension: 'ROWS', values: [values] }),
  });
  if (!writeResponse.ok) {
    const error = await writeResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Could not add the NEW 2026 row.');
  }
  return targetRow;
};

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
  sellColKFilled: boolean;
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

const fetchCsvRows = (gid: string, range?: string): Promise<string[][]> => {
  const rangeQuery = range ? `&range=${encodeURIComponent(range)}` : '';
  const url = `https://docs.google.com/spreadsheets/d/${NEW_MENU_SHEET_ID}/export?format=csv&gid=${gid}${rangeQuery}&t=${Date.now()}`;
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(url, {
      download: true,
      header: false,
      complete: ({ data, errors }) => {
        if (errors.length) {
          reject(new Error(errors[0].message));
          return;
        }

        resolve(data);
      },
      error: reject,
    });
  });
};

export const fetchNewMenuRows = async (): Promise<NewMenuRow[]> => {
  const [newMenuRows, sellRows] = await Promise.all([
    fetchCsvRows(NEW_MENU_GID),
    fetchCsvRows(SELL_GID, 'A:K'),
  ]);
  const completedSellRows = sellRows.filter(row => String(row[10] || '').trim() !== '');
  const completedLinks = new Set(completedSellRows.map(row => String(row[3] || '').trim()).filter(Boolean));
  const completedReferences = new Set(completedSellRows.map(row => String(row[9] || '').trim()).filter(Boolean));

  const rows = newMenuRows.map((row, index) => {
    const reference = row[0]?.trim() || '';
    const firstImage = row[5]?.trim() || '';
    return {
      reference,
      date: row[1]?.trim() || '',
      supplier: row[4]?.trim() || '',
      cnyRate: row[2]?.trim() || '',
      sellRate: row[3]?.trim() || '',
      firstImage,
      amountCny: row[6]?.trim() || '',
      secondImage: row[7]?.trim() || '',
      cbm: row[8]?.trim() || '',
      cbmFactor: row[10]?.trim() || '',
      cbmSellPrice: row[11]?.trim() || '',
      sharePercent: row[12]?.trim() || '',
      sellColKFilled: completedReferences.has(reference) || (Boolean(firstImage) && completedLinks.has(firstImage)),
      sheetRowNumber: index + 1,
    };
  }).filter(row => {
    const isHeader = ['reference', 'ref'].includes(row.reference.toLowerCase())
      && row.date.toLowerCase() === 'date';
    return !isHeader && Boolean(row.reference || row.date || row.supplier || row.amountCny || row.firstImage || row.secondImage || row.cbm);
  });

  return sortNewMenuRows(rows);
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
