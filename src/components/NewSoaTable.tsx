import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Printer, RefreshCw, X } from 'lucide-react';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import { generateSOA } from '../services/googleSheetsService';
import { NEW_MENU_SHEET_ID } from '../services/newMenuService';
import { fetchNewSoaRows, type NewSoaCategory, type NewSoaRow } from '../services/newSoaService';
import { formatAmount, formatAppDate } from '../utils/formatters';

const COUNTER_GID = '1049592506';
const COUNTER_URL = `https://docs.google.com/spreadsheets/d/${NEW_MENU_SHEET_ID}/edit?gid=${COUNTER_GID}`;
const COUNTER_PDF_URL = `https://docs.google.com/spreadsheets/d/${NEW_MENU_SHEET_ID}/export?format=pdf&gid=${COUNTER_GID}&range=A1:D35&size=A4&portrait=true&scale=4&gridlines=false`;

const NewSoaTable: React.FC = () => {
  const { accessToken, isAuthenticated, login, logout } = useGoogleAuth();
  const [rows, setRows] = useState<NewSoaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<NewSoaCategory | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setRows(await fetchNewSoaRows()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Failed to load SELL data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(() => selectedRows
    .map(rowNumber => rows.find(row => row.sheetRowNumber === rowNumber))
    .filter((row): row is NewSoaRow => Boolean(row)), [rows, selectedRows]);
  const visibleRows = useMemo(() => {
    const batches = new Map<string, NewSoaRow[]>();
    rows.filter(row => row.category !== 'CBM').forEach(row => {
      batches.set(row.batch, [...(batches.get(row.batch) || []), row]);
    });

    const ordered: NewSoaRow[] = [];
    for (const batchRows of batches.values()) {
      const items = batchRows.filter(row => row.category === 'ITEMS');
      const interests = batchRows.filter(row => row.category === 'INTEREST');
      const shown = new Set<number>();
      items.forEach(item => {
        ordered.push(item);
        const matchingInterest = interests.find(interest => !shown.has(interest.sheetRowNumber)
          && interest.reference === `${item.reference.slice(0, -1)}C`);
        if (matchingInterest) {
          ordered.push(matchingInterest);
          shown.add(matchingInterest.sheetRowNumber);
        }
      });
      interests.filter(interest => !shown.has(interest.sheetRowNumber)).forEach(interest => ordered.push(interest));
    }
    return ordered;
  }, [rows]);

  const toggle = (row: NewSoaRow) => {
    const isSelected = selectedRows.includes(row.sheetRowNumber);
    if (!isSelected && selectedRows.length >= 3) {
      window.alert('You can only select up to 3 entries.');
      return;
    }
    if (!isSelected && selectedCategory && selectedCategory !== row.category) {
      window.alert(`Select only ${selectedCategory} entries for one SOA.`);
      return;
    }
    const next = isSelected
      ? selectedRows.filter(value => value !== row.sheetRowNumber)
      : [...selectedRows, row.sheetRowNumber];
    setSelectedRows(next);
    setSelectedCategory(next.length === 0 ? null : row.category);
  };

  const issue = async (print: boolean) => {
    if (!isAuthenticated || !accessToken) {
      window.alert(`Please sign in with Google to ${print ? 'print' : 'issue'} an SOA.`);
      login();
      return;
    }
    if (!selectedCategory || selected.length === 0) return;

    const selectionType = selectedCategory === 'CBM' ? 'CBM' : 'DR';
    const toSoaSource = (row: NewSoaRow) => ({
      Color: row.issueDate,
      Description: row.description,
      Remarks: row.reference,
      PHP: row.amount,
      CBMPHP: row.amount,
    });
    const sourceRows = selected.map(toSoaSource);
    const matchedCbmRows = selectedCategory === 'ITEMS'
      ? selected.map(row => rows.find(candidate => candidate.reference === `${row.reference.slice(0, -1)}B`))
      : [];
    const missingMatches = selectedCategory === 'ITEMS'
      ? selected.filter((_, index) => !matchedCbmRows[index]).map(row => `${row.reference.slice(0, -1)}B`)
      : [];
    if (missingMatches.length) {
      window.alert(`Could not find matching CBM row${missingMatches.length === 1 ? '' : 's'}: ${missingMatches.join(', ')}`);
      return;
    }
    const secondPageRows = matchedCbmRows.filter((row): row is NewSoaRow => Boolean(row)).map(toSoaSource);

    try {
      setProcessing(true);
      await generateSOA(accessToken, NEW_MENU_SHEET_ID, sourceRows, selectionType, {
        formatSourceDates: true,
        secondPageRows,
      });
      window.open(print ? COUNTER_PDF_URL : COUNTER_URL, '_blank', 'noopener,noreferrer');
      setSelectedRows([]);
      setSelectedCategory(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not generate NEW SOA.';
      window.alert(`Error generating NEW SOA: ${message}`);
      if (message.includes('expired')) {
        logout();
        login();
      }
    } finally {
      setProcessing(false);
    }
  };

  return <>
    <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] sm:grid-cols-[80px_minmax(0,2fr)_minmax(0,1.35fr)_minmax(0,1fr)] bg-gray-50 border-b border-gray-200 text-[16px] font-semibold text-gray-500 uppercase sticky top-[109px] z-20 shadow-sm">
      <div className="p-1.5 sm:p-2 text-center border-r border-gray-200/50"><span className="sm:hidden">#</span><span className="hidden sm:inline">Batch</span></div>
      <div className="p-1.5 sm:p-2 text-left border-r border-gray-200/50">Description</div>
      <div className="hidden sm:block p-2 text-center border-r border-gray-200/50">Date / DR #</div>
      <div className="p-1.5 sm:p-2 text-right">Amount</div>
    </div>
    <div className="min-h-[300px] rounded-b-2xl overflow-hidden bg-white divide-y divide-gray-100">
      {loading ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><RefreshCw size={29} className="animate-spin mb-3 opacity-50" /><p className="text-[12.5px]">Loading SELL data...</p></div>
        : error ? <div className="text-center py-20 text-red-500"><p className="font-medium mb-2">Unavailable</p><p className="text-[11px] opacity-70">{error}</p><button onClick={load} className="mt-4 px-4 py-2 bg-gray-900 text-white text-[11px] rounded-lg">Retry</button></div>
        : visibleRows.length === 0 ? <div className="text-center py-20 text-gray-400 text-[12.5px]">No SELL entries found.</div>
        : visibleRows.map(row => {
          const checked = selectedRows.includes(row.sheetRowNumber);
          const disabled = !checked && ((selectedCategory !== null && selectedCategory !== row.category) || selectedRows.length >= 3);
          return <label key={row.sheetRowNumber} className={`grid grid-cols-[48px_minmax(0,1fr)_auto] sm:grid-cols-[80px_minmax(0,2fr)_minmax(0,1.35fr)_minmax(0,1fr)] items-center text-[19px] cursor-pointer transition-colors ${checked ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'} ${disabled ? 'opacity-45' : ''}`}>
            <div className="p-1.5 sm:p-2 flex items-center justify-center gap-0.5 sm:gap-1 border-r border-gray-100"><input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(row)} className="w-5 h-5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span>{row.batch || '-'}</span></div>
            <div className="p-1.5 sm:p-2 min-w-0 border-r border-gray-100 text-gray-700 break-words"><div>{row.description}</div><div className="text-[13.5px] font-semibold text-blue-600">{row.category}</div></div>
            <div className="col-span-3 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1 p-2 min-w-0 border-t sm:border-t-0 sm:border-r border-gray-100 text-gray-600"><div className="text-[13.5px] font-semibold text-gray-500">DATE · DR #</div><div className="text-[13.5px] text-gray-500">{formatAppDate(row.issueDate)}</div><div>{row.reference}</div></div>
            <div className="col-start-3 row-start-1 sm:col-start-4 p-1.5 sm:p-2 text-right text-[16px] sm:text-[19px] font-semibold text-emerald-600 whitespace-nowrap">{formatAmount(row.amount) || row.amount || '-'}</div>
          </label>;
        })}
    </div>
    <div className="fixed bottom-2 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-0.75rem)] sm:w-[min(94vw,42rem)] rounded-2xl border border-gray-200 bg-white shadow-xl px-3 py-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
      <div className="min-w-0 pr-8 sm:pr-0 sm:flex-1 text-[16px] text-gray-700">{selectedRows.length} selected{selectedCategory ? ` · ${selectedCategory}` : ''}</div>
      <button type="button" onClick={() => void issue(false)} disabled={selectedRows.length === 0 || processing} className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-[16px] font-medium text-white disabled:opacity-40">{processing ? 'Processing...' : 'Issue SOA'}</button>
      <button type="button" onClick={() => void issue(true)} disabled={selectedRows.length === 0 || processing} className="shrink-0 rounded-lg bg-gray-800 px-4 py-2 text-[16px] font-medium text-white disabled:opacity-40" title="Print SOA"><Printer size={22} /></button>
      <button type="button" onClick={() => { setSelectedRows([]); setSelectedCategory(null); }} disabled={processing || selectedRows.length === 0} className="absolute right-2 top-2 sm:static p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Clear selection"><X size={22} /></button>
    </div>
  </>;
};

export default NewSoaTable;
