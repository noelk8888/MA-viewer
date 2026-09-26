import Papa from 'papaparse';
import { NEW_MENU_SHEET_ID } from './newMenuService';

export const SELL_GID = '164287476';

export type NewSoaCategory = 'ITEMS' | 'CBM' | 'INTEREST';

export interface NewSoaRow {
  sheetRowNumber: number;
  batch: string;
  description: string;
  reference: string;
  amount: string;
  category: NewSoaCategory;
}

const categoryFor = (reference: string, description: string): NewSoaCategory | null => {
  if (description.toUpperCase().includes('INTEREST') || /C$/i.test(reference)) return 'INTEREST';
  if (/B$/i.test(reference)) return 'CBM';
  if (/A$/i.test(reference)) return 'ITEMS';
  return null;
};

export const fetchNewSoaRows = async (): Promise<NewSoaRow[]> => {
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
          const reference = row[9]?.trim() || '';
          const description = row[2]?.trim() || '';
          const category = categoryFor(reference, description);
          if (!category || !reference || !description) return [];
          return [{
            sheetRowNumber: index + 1,
            batch: row[0]?.trim() || '',
            description,
            reference,
            amount: row[7]?.trim() || '',
            category,
          }];
        });

        resolve(rows.reverse());
      },
      error: reject,
    });
  });
};

