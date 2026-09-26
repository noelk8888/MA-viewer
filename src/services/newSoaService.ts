import Papa from 'papaparse';
import { NEW_MENU_SHEET_ID } from './newMenuService';
import { toIsoDate } from '../utils/formatters';

export const SELL_GID = '164287476';

export type NewSoaCategory = 'ITEMS' | 'CBM' | 'INTEREST';

export interface NewSoaRow {
  sheetRowNumber: number;
  issueDate: string;
  batch: string;
  description: string;
  reference: string;
  amount: string;
  category: NewSoaCategory;
}

const categoryFor = (reference: string, description: string): NewSoaCategory | null => {
  const upperDescription = description.toUpperCase();
  if (upperDescription.includes('INTEREST') || /C$/i.test(reference)) return 'INTEREST';
  if (/\bCBM\b/i.test(description) || /B$/i.test(reference)) return 'CBM';
  if (reference && description) return 'ITEMS';
  return null;
};

const cleanDescription = (description: string): string => description.replace(/\s+bags?\s*$/i, '').trim();

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

        const sequenceByBatch = new Map<string, number>();
        const lastItemByBatch = new Map<string, number>();
        const legacyItemSequence = new Map<string, number>();
        const interestFallbackByBatch = new Map<string, number>();

        const rows = data.flatMap((row, index) => {
          const rawReference = row[9]?.trim() || '';
          const rawDescription = row[2]?.trim() || '';
          const batch = row[0]?.trim() || '';
          const issueDate = toIsoDate(row[8]?.trim() || '');
          const hasIssueDate = Boolean(issueDate);
          const hasCompletionDate = Boolean(row[10]?.trim());
          const category = categoryFor(rawReference, rawDescription);
          if (!category || !rawReference || !rawDescription || !batch) return [];

          const batchCode = batch.padStart(2, '0');
          const standardReference = rawReference.match(/^(\d{2})(\d{2})([ABC])$/i);
          let sequence: number;
          let reference: string;

          if (standardReference) {
            sequence = Number(standardReference[2]);
            reference = rawReference.toUpperCase();
            if (category === 'ITEMS') {
              sequenceByBatch.set(batchCode, Math.max(sequenceByBatch.get(batchCode) || 0, sequence));
              lastItemByBatch.set(batchCode, sequence);
            }
          } else if (category === 'ITEMS') {
            sequence = (sequenceByBatch.get(batchCode) || 0) + 1;
            sequenceByBatch.set(batchCode, sequence);
            lastItemByBatch.set(batchCode, sequence);
            legacyItemSequence.set(`${batchCode}:${rawReference.replace(/-A$/i, '')}`, sequence);
            reference = `${batchCode}${String(sequence).padStart(2, '0')}A`;
          } else if (category === 'CBM') {
            sequence = lastItemByBatch.get(batchCode) || Math.max(sequenceByBatch.get(batchCode) || 0, 1);
            reference = `${batchCode}${String(sequence).padStart(2, '0')}B`;
          } else {
            const legacyBase = rawReference.replace(/-A$/i, '');
            sequence = legacyItemSequence.get(`${batchCode}:${legacyBase}`) || 0;
            if (!sequence) {
              sequence = (interestFallbackByBatch.get(batchCode) || 0) + 1;
              interestFallbackByBatch.set(batchCode, sequence);
            }
            reference = `${batchCode}${String(sequence).padStart(2, '0')}C`;
          }

          if (!hasIssueDate || hasCompletionDate) return [];
          return [{
            sheetRowNumber: index + 1,
            issueDate,
            batch,
            description: cleanDescription(rawDescription),
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
