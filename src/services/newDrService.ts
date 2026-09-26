import Papa from 'papaparse';
import { NEW_MENU_SHEET_ID } from './newMenuService';
import { SELL_GID, type NewSoaCategory } from './newSoaService';
import { toIsoDate } from '../utils/formatters';
import { getSheetNameByGid } from './googleSheetsService';

export const NEW_DR_GID = '519420961';
export const NEW_DR_URL = `https://docs.google.com/spreadsheets/d/${NEW_MENU_SHEET_ID}/edit?gid=${NEW_DR_GID}#gid=${NEW_DR_GID}`;

export interface NewDrRow {
  sheetRowNumber: number;
  batch: string;
  sourceDate: string;
  description: string;
  image: string;
  price: string;
  quantity: string;
  factor: string;
  amount: string;
  issueDate: string;
  reference: string;
  category: NewSoaCategory;
}

const categoryFor = (reference: string, description: string): NewSoaCategory => {
  if (/C$/i.test(reference) || /\bINTEREST\b/i.test(description)) return 'INTEREST';
  if (/B$/i.test(reference) || /\bCBM\b/i.test(description)) return 'CBM';
  return 'ITEMS';
};

export const fetchNewDrRows = async (): Promise<NewDrRow[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${NEW_MENU_SHEET_ID}/export?format=csv&gid=${SELL_GID}&t=${Date.now()}`;
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(url, {
      download: true,
      header: false,
      complete: ({ data, errors }) => {
        if (errors.length) {
          reject(new Error(errors[0].message));
          return;
        }

        const rows = data.flatMap((row, index) => {
          const batch = row[0]?.trim() || '';
          const isCompleted = Boolean(row[10]?.trim());
          // NEW DR lists every SELL row whose column A is filled and column K is empty.
          if (!batch || isCompleted) return [];

          const reference = row[9]?.trim().toUpperCase() || '';
          const description = row[2]?.trim() || '';
          const category = categoryFor(reference, description);
          const issueDate = toIsoDate(row[8]?.trim() || '');

          return [{
            sheetRowNumber: index + 1,
            batch,
            sourceDate: toIsoDate(row[1]?.trim() || ''),
            description,
            image: row[3]?.trim() || '',
            price: row[4]?.trim() || '',
            quantity: row[5]?.trim() || '',
            factor: row[6]?.trim() || '',
            amount: row[7]?.trim() || '',
            issueDate,
            reference,
            category,
          }];
        });

        resolve(rows.reverse());
      },
      error: reject,
    });
  });
};

export interface NewDrPrintPayload {
  primary: NewDrRow;
  cbm?: NewDrRow;
}

const numeric = (value: string, label: string): number => {
  const parsed = Number(value.replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be numeric before issuing a NEW DR.`);
  return parsed;
};

const dateFormula = (value: string): string => {
  const iso = toIsoDate(value);
  if (!iso) throw new Error('The selected SELL row needs a valid date in column I.');
  const [year, month, day] = iso.split('-').map(Number);
  return `=DATE(${year},${month},${day})`;
};

const driveImageFormula = (link: string): string => {
  const id = link.match(/[?&]id=([^&]+)/)?.[1] || link.match(/\/d\/([^/]+)/)?.[1];
  return id ? `=IMAGE("https://drive.google.com/uc?export=view&id=${id}",1)` : '';
};

export const generateNewDrSheet = async (accessToken: string, payload: NewDrPrintPayload): Promise<void> => {
  const { primary, cbm } = payload;
  const interest = primary.category === 'INTEREST';
  if (!interest && !cbm) throw new Error(`Could not find matching CBM row ${primary.reference.slice(0, -1)}B.`);

  const sheetName = await getSheetNameByGid(accessToken, NEW_MENU_SHEET_ID, NEW_DR_GID);
  const quotedName = `'${sheetName.replace(/'/g, "''")}'`;
  // NEW DR is a four-page print canvas. Google Sheets prints down, then across:
  // A1:E42 invoice, B45:D80 image, G1:K42 CBM invoice, H45:J80 CBM image.
  const values: Array<Array<string | number>> = Array.from({ length: 42 }, () => Array.from({ length: 11 }, () => ''));
  const set = (row: number, column: number, value: string | number) => { values[row - 1][column - 1] = value; };

  const itemReference = primary.reference;
  const itemQuantity = interest ? '' : numeric(primary.price, `${itemReference} quantity`);
  const cnyRate = interest ? 0 : numeric(primary.quantity, `${itemReference} CNY rate`);
  const factor = interest ? 1 : numeric(primary.factor || '1', `${itemReference} factor`);
  const itemRate = cnyRate * factor;
  const itemAmount = numeric(primary.amount, `${itemReference} amount`);

  set(1, 1, 'J2N');
  set(2, 1, 'Transfer to:'); set(2, 3, 'DMC - Marlon'); set(2, 4, 'Ref #'); set(2, 5, itemReference);
  set(3, 3, '22 Ford Ave., Doña Manuela Subd.,'); set(3, 4, 'Date'); set(3, 5, dateFormula(primary.issueDate));
  set(4, 3, 'Pamplona Tres, Las Piñas'); set(4, 4, 'Page:'); set(4, 5, 1);
  set(6, 1, 'Quantity'); set(6, 3, 'Description'); set(6, 4, 'Unit Price'); set(6, 5, 'Subtotal');
  set(7, 1, itemQuantity); set(7, 3, primary.description); set(7, 4, interest ? '' : itemRate); set(7, 5, itemAmount);
  set(8, 3, interest ? 'INTEREST' : 'ITEMS');
  set(25, 2, 'ITEMS:'); set(25, 3, `Ref# ${itemReference}`);
  if (!interest) {
    set(26, 2, 'CBM:'); set(26, 3, `Ref# ${cbm?.reference || `${itemReference.slice(0, -1)}B`}`);
    set(29, 2, 'CNY:'); set(29, 3, cnyRate);
    set(30, 2, 'factor:'); set(30, 3, factor);
    set(31, 2, 'RATE:'); set(31, 3, itemRate);
  }
  set(38, 3, 'TOTAL'); set(38, 4, '=SUM(E7:E36)');
  set(40, 5, 'RECEIVED IN GOOD CONDITION:');
  set(42, 5, 'Signature Over Printed Name / Date');

  if (cbm) {
    const printedCbmReference = cbm.reference;
    set(1, 7, 'J2N');
    set(2, 7, 'Transfer to:'); set(2, 9, 'DMC - Marlon'); set(2, 10, 'Ref #'); set(2, 11, printedCbmReference);
    set(3, 9, '22 Ford Ave., Doña Manuela Subd.,'); set(3, 10, 'Date'); set(3, 11, dateFormula(cbm.issueDate));
    set(4, 9, 'Pamplona Tres, Las Piñas'); set(4, 10, 'Page:'); set(4, 11, 1);
    set(6, 7, 'Quantity'); set(6, 9, 'Description'); set(6, 10, 'Unit Price'); set(6, 11, 'Subtotal');
    set(7, 7, numeric(cbm.quantity, `${cbm.reference} quantity`));
    set(7, 9, cbm.description);
    set(7, 10, numeric(cbm.price, `${cbm.reference} unit price`));
    set(7, 11, numeric(cbm.amount, `${cbm.reference} amount`));
    set(8, 9, 'CBM');
    set(25, 8, 'ITEMS:'); set(25, 9, `Ref# ${itemReference}`);
    set(26, 8, 'CBM:'); set(26, 9, `Ref# ${printedCbmReference}`);
    set(38, 9, 'TOTAL'); set(38, 10, '=SUM(K7:K36)');
    set(40, 11, 'RECEIVED IN GOOD CONDITION:');
    set(42, 11, 'Signature Over Printed Name / Date');
  }

  const clearRange = `${quotedName}!A1:K90`;
  const clearResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${NEW_MENU_SHEET_ID}/values/${encodeURIComponent(clearRange)}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!clearResponse.ok) {
    const error = await clearResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Could not clear the NEW DR Google Sheet.');
  }

  const range = `${quotedName}!A1:K42`;
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${NEW_MENU_SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Could not generate the NEW DR Google Sheet.');
  }

  const imageWrites: Array<{ range: string; values: string[][] }> = [];
  if (primary.image) imageWrites.push({ range: `${quotedName}!B45`, values: [[driveImageFormula(primary.image)]] });
  if (cbm?.image) imageWrites.push({ range: `${quotedName}!H45`, values: [[driveImageFormula(cbm.image)]] });
  if (imageWrites.length) {
    const imageResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${NEW_MENU_SHEET_ID}/values:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: imageWrites }),
    });
    if (!imageResponse.ok) {
      const error = await imageResponse.json().catch(() => ({}));
      throw new Error(error.error?.message || 'The NEW DR forms were written, but their image pages could not be generated.');
    }
  }
};
