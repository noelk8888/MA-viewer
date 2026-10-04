import React, { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, RefreshCw, X } from 'lucide-react';
import { fetchNewDrRows, generateNewDrSheet, NEW_DR_URL, saveNewDrFields, type NewDrRow } from '../services/newDrService';
import { formatAmount } from '../utils/formatters';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

type DrDraft = { issueDate: string; reference: string };
const fieldsFor = (row: NewDrRow): DrDraft => ({ issueDate: row.issueDate, reference: row.reference });
const isComplete = (row: NewDrRow) => Boolean(row.issueDate && row.reference);

const findCbm = (rows: NewDrRow[], item: NewDrRow): NewDrRow | undefined => {
  if (item.category !== 'ITEMS') return undefined;
  const expectedReference = item.reference ? `${item.reference.slice(0, -1)}B` : '';
  if (expectedReference) {
    const byReference = rows.find(row => row.batch === item.batch && row.category === 'CBM' && row.reference === expectedReference);
    if (byReference) return byReference;
  }
  const byOrdinal = rows.find(row => row.batch === item.batch && row.category === 'CBM' && row.batchOrdinal === item.batchOrdinal);
  return byOrdinal && (!expectedReference || !byOrdinal.reference) ? byOrdinal : undefined;
};

type NewDrDisplayRow = { row: NewDrRow; description: string };

const interestDescription = (interest: NewDrRow, cbm?: NewDrRow, item?: NewDrRow): string => {
  if (/\bINTEREST\s*-\s*\d+/i.test(interest.description)) return interest.description;
  const count = cbm?.description.match(/(\d+)\s*(?:bags?)?\s*$/i)?.[1]
    || item?.description.match(/(\d+)\s*(?:bags?)?\s*$/i)?.[1];
  return count ? `${interest.description} - ${count}` : interest.description;
};

const groupNewDrRows = (rows: NewDrRow[]): NewDrDisplayRow[] => {
  const batches = new Map<string, NewDrRow[]>();
  rows.forEach(row => batches.set(row.batch, [...(batches.get(row.batch) || []), row]));
  const display: NewDrDisplayRow[] = [];

  for (const batchRows of batches.values()) {
    const items = batchRows.filter(row => row.category === 'ITEMS').sort((a, b) => a.batchOrdinal - b.batchOrdinal);
    const cbms = batchRows.filter(row => row.category === 'CBM');
    const interests = batchRows.filter(row => row.category === 'INTEREST');
    const shown = new Set<number>();
    const append = (row: NewDrRow, description = row.description) => {
      display.push({ row, description });
      shown.add(row.sheetRowNumber);
    };
    const matchingInterest = (ordinal: number, reference?: string) => {
      const expectedReference = reference?.replace(/[AB]$/i, 'C');
      return (expectedReference && interests.find(row => !shown.has(row.sheetRowNumber) && row.reference === expectedReference))
        || interests.find(row => !shown.has(row.sheetRowNumber) && !row.reference && row.batchOrdinal === ordinal);
    };

    items.forEach(item => {
      append(item);
      const cbm = findCbm(batchRows, item);
      if (cbm && !shown.has(cbm.sheetRowNumber)) append(cbm);
      const interest = matchingInterest(item.batchOrdinal, item.reference || cbm?.reference);
      if (interest) append(interest, interestDescription(interest, cbm, item));
    });
    cbms.filter(row => !shown.has(row.sheetRowNumber)).forEach(cbm => {
      append(cbm);
      const interest = matchingInterest(cbm.batchOrdinal, cbm.reference);
      if (interest) append(interest, interestDescription(interest, cbm));
    });
    interests.filter(row => !shown.has(row.sheetRowNumber)).forEach(row => append(row));
  }
  return display;
};

const NewDrTable: React.FC = () => {
  const { accessToken, isAuthenticated, login, logout } = useGoogleAuth();
  const [rows, setRows] = useState<NewDrRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DrDraft>>({});
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRowNumber, setSavingRowNumber] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextRows = await fetchNewDrRows();
      setRows(nextRows);
      setDrafts(Object.fromEntries(nextRows.map(row => [row.sheetRowNumber, fieldsFor(row)])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load SELL data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = rows.find(row => row.sheetRowNumber === selectedRowNumber) || null;
  const displayRows = groupNewDrRows(rows);
  const selectedCbm = selected ? findCbm(rows, selected) : undefined;
  const hasUnsavedFields = (row: NewDrRow) => {
    const draft = drafts[row.sheetRowNumber];
    return Boolean(draft && (draft.issueDate !== row.issueDate || draft.reference.trim().toUpperCase() !== row.reference));
  };
  const canIssue = Boolean(selected && selected.category !== 'CBM' && selected.amount && isComplete(selected)
    && !hasUnsavedFields(selected) && (selected.category === 'INTEREST' || (selectedCbm && selectedCbm.amount && isComplete(selectedCbm) && !hasUnsavedFields(selectedCbm))));

  const updateDraft = (rowNumber: number, field: keyof DrDraft, value: string) => {
    setDrafts(current => ({ ...current, [rowNumber]: { ...current[rowNumber], [field]: value } }));
  };

  const save = async (row: NewDrRow) => {
    if (!isAuthenticated || !accessToken) {
      window.alert('Please sign in with Google to edit DATE and DR #.');
      login();
      return;
    }
    const draft = drafts[row.sheetRowNumber];
    if (!draft) return;
    try {
      setSavingRowNumber(row.sheetRowNumber);
      await saveNewDrFields(accessToken, row.sheetRowNumber, draft.issueDate, draft.reference);
      setRows(current => current.map(item => item.sheetRowNumber === row.sheetRowNumber
        ? { ...item, issueDate: draft.issueDate, reference: draft.reference.trim().toUpperCase() }
        : item));
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Could not save DATE and DR #.');
    } finally {
      setSavingRowNumber(null);
    }
  };

  const issue = async () => {
    if (!selected || !canIssue || processing || savingRowNumber !== null) return;
    if (!isAuthenticated || !accessToken) {
      window.alert('Please sign in with Google to issue a NEW DR.');
      login();
      return;
    }
    try {
      setProcessing(true);
      // Check the latest SELL values before changing the shared NEW DR print sheet.
      const latestRows = await fetchNewDrRows();
      const primary = latestRows.find(row => row.sheetRowNumber === selected.sheetRowNumber);
      if (!primary || primary.batch !== selected.batch || primary.description !== selected.description || !primary.amount || !isComplete(primary)) {
        throw new Error('The selected SELL row needs a saved DATE and DR #. Refresh and try again.');
      }
      const cbm = findCbm(latestRows, primary);
      if (primary.category === 'ITEMS' && (!cbm || !cbm.amount || !isComplete(cbm))) {
        throw new Error('The matching CBM row needs a saved DATE and DR # before issuing this DR.');
      }
      await generateNewDrSheet(accessToken, { primary, cbm });
      window.open(NEW_DR_URL, '_blank', 'noopener,noreferrer');
      setSelectedRowNumber(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not generate NEW DR.';
      window.alert(`Error generating NEW DR: ${message}`);
      if (message.includes('expired') || message.includes('authentication')) {
        logout();
        login();
      }
    } finally {
      setProcessing(false);
    }
  };

  const issueHint = (() => {
    if (!selected) return '0 selected';
    if (selected.category === 'CBM') return 'CBM is issued with its ITEMS row';
    if (!selected.amount) return 'Amount is required in SELL';
    if (!isComplete(selected) || hasUnsavedFields(selected)) return 'Save DATE and DR # for this row';
    if (selected.category === 'ITEMS' && (!selectedCbm || !selectedCbm.amount || !isComplete(selectedCbm) || hasUnsavedFields(selectedCbm))) return 'Complete the matching CBM row';
    return `1 selected · ${selected.category}`;
  })();

  return <>
    <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] sm:grid-cols-[80px_minmax(0,2fr)_minmax(0,1.35fr)_minmax(0,1fr)] bg-gray-50 border-b border-gray-200 text-lg font-semibold text-gray-500 uppercase shadow-sm">
      <div className="p-1.5 sm:p-2 text-center border-r border-gray-200/50"><span className="sm:hidden">#</span><span className="hidden sm:inline">Batch</span></div>
      <div className="p-1.5 sm:p-2 text-left border-r border-gray-200/50">Description</div>
      <div className="hidden sm:block p-2 text-center border-r border-gray-200/50">Date / DR #</div>
      <div className="p-1.5 sm:p-2 text-right">Amount</div>
    </div>
    <div className="min-h-[300px] rounded-b-2xl bg-white divide-y divide-gray-100 pb-28">
      {loading ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><RefreshCw size={32} className="animate-spin mb-3 opacity-50" /><p className="text-[21px]">Loading SELL data...</p></div>
        : error ? <div className="text-center py-20 text-red-500"><p className="font-medium mb-2 text-[21px]">Unavailable</p><p className="text-lg opacity-70">{error}</p><button onClick={load} className="mt-4 px-4 py-2 bg-gray-900 text-white text-lg rounded-lg">Retry</button></div>
        : rows.length === 0 ? <div className="text-center py-20 text-gray-400 text-[21px]">No unfinished SELL batch rows found.</div>
        : displayRows.map(({ row, description }, index) => {
          const checked = selectedRowNumber === row.sheetRowNumber;
          const draft = drafts[row.sheetRowNumber] || fieldsFor(row);
          const dirty = hasUnsavedFields(row);
          const newBatch = index === 0 || displayRows[index - 1].row.batch !== row.batch;
          return <div key={row.sheetRowNumber} className={`grid grid-cols-[48px_minmax(0,1fr)_auto] sm:grid-cols-[80px_minmax(0,2fr)_minmax(0,1.35fr)_minmax(0,1fr)] items-center text-[21px] transition-colors ${newBatch && index > 0 ? 'border-t-2 border-gray-400' : ''} ${checked ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'}`}>
            <div className="p-1.5 sm:p-2 flex items-center justify-center gap-0.5 sm:gap-1 border-r border-gray-100"><input type="checkbox" checked={checked} disabled={row.category === 'CBM'} onChange={() => setSelectedRowNumber(checked ? null : row.sheetRowNumber)} aria-label={`Select ${row.description} for NEW DR`} className="w-5 h-5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30" /><span>{row.batch}</span></div>
            <div className={`p-1.5 sm:p-2 min-w-0 border-r border-gray-100 text-gray-700 break-words ${row.readyForSoa ? 'opacity-45 grayscale' : ''}`}><div>{description}</div><div className="text-[15px] font-semibold text-blue-600">{row.category}</div></div>
            <div className={`col-span-3 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1 p-2 min-w-0 border-t sm:border-t-0 sm:border-r border-gray-100 space-y-1 ${row.readyForSoa ? 'opacity-45 grayscale' : ''}`}>
              <label className="block text-[15px] font-semibold text-gray-500">DATE<input type="date" value={draft.issueDate} onChange={event => updateDraft(row.sheetRowNumber, 'issueDate', event.target.value)} aria-label={`DATE for ${row.description}, SELL row ${row.sheetRowNumber}`} className="block w-full min-w-0 max-w-full rounded border border-gray-300 bg-white px-2 py-1 text-lg text-gray-900" /></label>
              <div className="text-[15px] font-semibold text-gray-500">DR #<div className="flex items-center gap-1"><input type="text" value={draft.reference} onChange={event => updateDraft(row.sheetRowNumber, 'reference', event.target.value)} aria-label={`DR number for ${row.description}, SELL row ${row.sheetRowNumber}`} className="w-full min-w-0 rounded border border-gray-300 bg-white px-2 py-1 text-lg text-gray-900" /><button type="button" onClick={() => void save(row)} disabled={!dirty || savingRowNumber !== null || processing} className="shrink-0 rounded bg-blue-600 px-2 py-1 text-lg text-white disabled:opacity-40">{savingRowNumber === row.sheetRowNumber ? 'Saving' : 'Save'}</button></div></div>
            </div>
            <div className={`col-start-3 row-start-1 sm:col-start-4 p-1.5 sm:p-2 text-right text-lg sm:text-[21px] font-semibold text-emerald-600 whitespace-nowrap ${row.readyForSoa ? 'opacity-45 grayscale' : ''}`}>{formatAmount(row.amount) || row.amount || '-'}</div>
          </div>;
        })}
    </div>
    <div className="fixed bottom-2 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-0.75rem)] sm:w-[min(94vw,36rem)] rounded-2xl border border-gray-200 bg-white shadow-xl px-3 py-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
      <div className="min-w-0 pr-8 sm:pr-0 sm:flex-1 text-lg text-gray-700">{issueHint}</div>
      <button type="button" onClick={() => void issue()} disabled={!canIssue || processing || savingRowNumber !== null} className="shrink-0 justify-center rounded-lg bg-red-600 px-4 py-2 text-lg font-medium text-white disabled:opacity-40 flex items-center gap-2"><FileSpreadsheet size={24} />{processing ? 'Generating...' : 'Issue DR'}</button>
      <button type="button" onClick={() => setSelectedRowNumber(null)} disabled={!selected || processing} className="absolute right-2 top-2 sm:static p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Clear selection"><X size={24} /></button>
    </div>
  </>;
};

export default NewDrTable;
