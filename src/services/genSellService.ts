import { getSheetNameByGid } from './googleSheetsService';
import { GEN_SELL_GID, NEW_MENU_SHEET_ID, type NewMenuRow } from './newMenuService';
import { toIsoDate } from '../utils/formatters';

const API_BASE = `https://sheets.googleapis.com/v4/spreadsheets/${NEW_MENU_SHEET_ID}`;

const requiredNumber = (value: string, label: string): number => {
  const parsed = Number(value.replace(/,/g, '').trim());
  if (!value.trim() || !Number.isFinite(parsed)) throw new Error(`${label} must be a number before generating GenSELL.`);
  return parsed;
};

const percentage = (value: string, label: string): number => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} needs a share percentage before generating GenSELL.`);
  const parsed = Number(trimmed.replace(/[%,]/g, ''));
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a percentage before generating GenSELL.`);
  return trimmed.endsWith('%') ? parsed / 100 : parsed;
};

const sheetDate = (value: string, label: string): number => {
  const iso = toIsoDate(value);
  if (!iso) throw new Error(`${label} needs a valid date before generating GenSELL.`);
  const [year, month, day] = iso.split('-').map(Number);
  return (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86_400_000;
};

const cbmSupplier = (supplier: string): string => {
  const match = supplier.match(/^(\s*#\S+)\s+.*\s*-\s*(\S.*?)\s*$/);
  if (!match) throw new Error(`Supplier "${supplier}" needs a #batch name - number pattern for its CBM row.`);
  return `${match[1]} CBM - ${match[2]}`;
};

type CellValue = { stringValue: string } | { numberValue: number } | { formulaValue: string };
const stringCell = (value: string): { userEnteredValue: CellValue } => ({ userEnteredValue: { stringValue: value } });
const numberCell = (value: number): { userEnteredValue: CellValue } => ({ userEnteredValue: { numberValue: value } });
const formulaCell = (value: string): { userEnteredValue: CellValue } => ({ userEnteredValue: { formulaValue: value } });
const blankCell = (): { userEnteredValue: CellValue } => stringCell('');

export const generateSellRows = async (accessToken: string, selectedRows: NewMenuRow[]): Promise<number> => {
  if (selectedRows.length === 0) return 0;

  const sheetName = await getSheetNameByGid(accessToken, NEW_MENU_SHEET_ID, GEN_SELL_GID);
  const quotedName = `'${sheetName.replace(/'/g, "''")}'`;
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const readResponse = await fetch(`${API_BASE}/values/${encodeURIComponent(`${quotedName}!A:N`)}?valueRenderOption=FORMATTED_VALUE`, { headers });
  if (!readResponse.ok) {
    const error = await readResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Could not inspect existing GenSELL rows.');
  }
  const existing = await readResponse.json() as { values?: string[][] };
  const lastOccupiedRow = (existing.values || []).reduce((last, row, index) =>
    row.some(value => String(value).trim() !== '') ? index + 1 : last, 0);
  const firstRow = Math.max(lastOccupiedRow + 1, 3);

  const rows = selectedRows.flatMap((source, index) => {
    const first = firstRow + index * 2;
    const second = first + 1;
    const reference = source.reference.trim();
    if (reference.length < 2 || !/A$/i.test(reference)) throw new Error(`Reference "${reference}" must end in A for its GenSELL pair.`);
    const batch = reference.slice(0, 2);
    const date = sheetDate(source.date, reference);
    const share = percentage(source.sharePercent, reference);

    return [
      { values: [
        stringCell(batch), numberCell(date), stringCell(source.supplier), stringCell(source.firstImage),
        numberCell(requiredNumber(source.amountCny, `${reference} CNY amount`)),
        numberCell(requiredNumber(source.sellRate, `${reference} sell rate`)), numberCell(1.05),
        formulaCell(`=E${first}*F${first}*G${first}`), blankCell(), stringCell(reference), blankCell(),
        numberCell(share), formulaCell(`=H${first}*L${first}`), formulaCell(`=H${first}-M${first}`),
      ] },
      { values: [
        stringCell(batch), numberCell(date), stringCell(cbmSupplier(source.supplier)), stringCell(source.secondImage),
        numberCell(requiredNumber(source.cbmSellPrice, `${reference} CBM price`)),
        numberCell(requiredNumber(source.cbm, `${reference} CBM volume`)), blankCell(),
        formulaCell(`=E${second}*F${second}`), blankCell(), stringCell(`${reference.slice(0, -1)}B`), blankCell(),
        numberCell(share), formulaCell(`=H${second}*L${second}`), formulaCell(`=H${second}-M${second}`),
      ] },
    ];
  });

  const formatByColumn = [
    { index: 1, type: 'DATE', pattern: 'dd-mmm-yyyy' },
    { index: 4, type: 'NUMBER', pattern: '#,##0' },
    { index: 5, type: 'NUMBER', pattern: '0.0000' },
    { index: 6, type: 'NUMBER', pattern: '0.00' },
    { index: 7, type: 'NUMBER', pattern: '#,##0.00' },
    { index: 8, type: 'DATE', pattern: 'dd-mmm-yyyy' },
    { index: 10, type: 'DATE', pattern: 'dd-mmm-yyyy' },
    { index: 11, type: 'PERCENT', pattern: '0%' },
    { index: 12, type: 'NUMBER', pattern: '#,##0' },
    { index: 13, type: 'NUMBER', pattern: '#,##0' },
  ];
  const startRowIndex = firstRow - 1;
  const endRowIndex = startRowIndex + rows.length;
  const requests = [
    { updateCells: { range: { sheetId: Number(GEN_SELL_GID), startRowIndex, endRowIndex, startColumnIndex: 0, endColumnIndex: 14 }, rows, fields: 'userEnteredValue' } },
    ...formatByColumn.map(({ index, type, pattern }) => ({ repeatCell: {
      range: { sheetId: Number(GEN_SELL_GID), startRowIndex, endRowIndex, startColumnIndex: index, endColumnIndex: index + 1 },
      cell: { userEnteredFormat: { numberFormat: { type, pattern } } },
      fields: 'userEnteredFormat.numberFormat',
    } })),
  ];
  const writeResponse = await fetch(`${API_BASE}:batchUpdate`, {
    method: 'POST', headers, body: JSON.stringify({ requests }),
  });
  if (!writeResponse.ok) {
    const error = await writeResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Could not generate GenSELL rows.');
  }
  return rows.length;
};
