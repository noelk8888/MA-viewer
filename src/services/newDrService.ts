import Papa from 'papaparse';
import { NEW_MENU_SHEET_ID } from './newMenuService';
import { SELL_GID, type NewSoaCategory } from './newSoaService';
import { toIsoDate } from '../utils/formatters';

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

const categoryFor = (reference: string, description: string): NewSoaCategory | null => {
  if (/C$/i.test(reference) || /\bINTEREST\b/i.test(description)) return 'INTEREST';
  if (/B$/i.test(reference) || /\bCBM\b/i.test(description)) return 'CBM';
  if (/A$/i.test(reference)) return 'ITEMS';
  return null;
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
          const reference = row[9]?.trim().toUpperCase() || '';
          const description = row[2]?.trim() || '';
          const category = categoryFor(reference, description);
          const issueDate = toIsoDate(row[8]?.trim() || '');
          const hasAmount = Boolean(row[7]?.trim());
          const hasCompletionDate = Boolean(row[10]?.trim());
          if (!category || !reference || !description || !hasAmount || !issueDate || hasCompletionDate) return [];

          return [{
            sheetRowNumber: index + 1,
            batch: row[0]?.trim() || '',
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

const PRINT_STORAGE_PREFIX = 'new-dr-print:';

export const openNewDrPrintPreview = (payload: NewDrPrintPayload): void => {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(`${PRINT_STORAGE_PREFIX}${key}`, JSON.stringify(payload));
  window.open(`${window.location.origin}${window.location.pathname}?newDrPrint=${encodeURIComponent(key)}`, '_blank', 'noopener,noreferrer');
};

export const readNewDrPrintPayload = (key: string): NewDrPrintPayload | null => {
  const storageKey = `${PRINT_STORAGE_PREFIX}${key}`;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NewDrPrintPayload;
  } catch {
    return null;
  }
};
