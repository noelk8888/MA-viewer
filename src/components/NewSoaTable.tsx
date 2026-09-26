import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Printer, RefreshCw, X } from 'lucide-react';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import { generateSOA } from '../services/googleSheetsService';
import { NEW_MENU_SHEET_ID } from '../services/newMenuService';
import { fetchNewSoaRows, type NewSoaCategory, type NewSoaRow } from '../services/newSoaService';
import { formatAmount } from '../utils/formatters';

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
    const sourceRows = selected.map(row => ({
      Color: row.batch,
      Description: row.description,
      Remarks: row.reference,
      PHP: row.amount,
      CBMPHP: row.amount,
    }));

    try {
      setProcessing(true);
      await generateSOA(accessToken, NEW_MENU_SHEET_ID, sourceRows, selectionType);
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
    <div className="grid grid-cols-[0.7fr_2fr_1fr_1.2fr] bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-[137px] z-20 shadow-sm">
      <div className="p-3 text-center border-r border-gray-200/50">Batch</div>
      <div className="p-3 text-left border-r border-gray-200/50">Description</div>
      <div className="p-3 text-center border-r border-gray-200/50">Reference</div>
      <div className="p-3 text-right">Amount</div>
    </div>
    <div className="min-h-[300px] rounded-b-2xl overflow-hidden bg-white divide-y divide-gray-100">
      {loading ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><RefreshCw size={32} className="animate-spin mb-3 opacity-50" /><p className="text-sm">Loading SELL data...</p></div>
        : error ? <div className="text-center py-20 text-red-500"><p className="font-medium mb-2">Unavailable</p><p className="text-xs opacity-70">{error}</p><button onClick={load} className="mt-4 px-4 py-2 bg-gray-900 text-white text-xs rounded-lg">Retry</button></div>
        : rows.length === 0 ? <div className="text-center py-20 text-gray-400 text-sm">No SELL entries found.</div>
        : rows.map(row => {
          const checked = selectedRows.includes(row.sheetRowNumber);
          const disabled = !checked && ((selectedCategory !== null && selectedCategory !== row.category) || selectedRows.length >= 3);
          return <label key={row.sheetRowNumber} className={`grid grid-cols-[0.7fr_2fr_1fr_1.2fr] min-h-20 items-center text-sm cursor-pointer transition-colors ${checked ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'} ${disabled ? 'opacity-45' : ''}`}>
            <div className="p-3 flex items-center justify-center gap-2 border-r border-gray-100"><input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(row)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span>{row.batch || '-'}</span></div>
            <div className="p-3 border-r border-gray-100 text-gray-700 break-words"><div>{row.description}</div><div className="mt-1 text-[10px] font-semibold text-blue-600">{row.category}</div></div>
            <div className="p-3 border-r border-gray-100 text-center text-gray-600">{row.reference}</div>
            <div className="p-3 text-right font-semibold text-emerald-600">{formatAmount(row.amount) || row.amount || '-'}</div>
          </label>;
        })}
    </div>
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(94vw,42rem)] rounded-2xl border border-gray-200 bg-white shadow-xl px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0 text-sm text-gray-700">{selectedRows.length} selected{selectedCategory ? ` · ${selectedCategory}` : ''}</div>
      <button type="button" onClick={() => void issue(false)} disabled={selectedRows.length === 0 || processing} className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{processing ? 'Processing...' : 'Issue SOA'}</button>
      <button type="button" onClick={() => void issue(true)} disabled={selectedRows.length === 0 || processing} className="shrink-0 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40" title="Print SOA"><Printer size={16} /></button>
      <button type="button" onClick={() => { setSelectedRows([]); setSelectedCategory(null); }} disabled={processing || selectedRows.length === 0} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Clear selection"><X size={16} /></button>
    </div>
  </>;
};

export default NewSoaTable;
