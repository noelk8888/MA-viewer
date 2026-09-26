import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, RefreshCw, X } from 'lucide-react';
import { fetchNewDrRows, generateNewDrSheet, NEW_DR_URL, type NewDrRow } from '../services/newDrService';
import { formatAmount } from '../utils/formatters';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

const NewDrTable: React.FC = () => {
  const { accessToken, isAuthenticated, login, logout } = useGoogleAuth();
  const [rows, setRows] = useState<NewDrRow[]>([]);
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setRows(await fetchNewDrRows()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Failed to load SELL data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleRows = useMemo(() => rows.filter(row => row.category !== 'CBM'), [rows]);
  const selected = rows.find(row => row.sheetRowNumber === selectedRowNumber) || null;

  const issue = async () => {
    if (!selected) return;
    if (!isAuthenticated || !accessToken) {
      window.alert('Please sign in with Google to issue a NEW DR.');
      login();
      return;
    }
    const primary = selected;
    let cbm: NewDrRow | undefined;
    if (selected.category === 'INTEREST') {
      cbm = undefined;
    } else {
      const cbmReference = `${selected.reference.slice(0, -1)}B`;
      cbm = rows.find(row => row.reference === cbmReference);
      if (!cbm) {
        window.alert(`Could not find matching CBM row ${cbmReference}.`);
        return;
      }
    }
    try {
      setProcessing(true);
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

  return <>
    <div className="grid grid-cols-[0.7fr_2fr_1fr_1.2fr] bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-[109px] z-20 shadow-sm">
      <div className="p-3 text-center border-r border-gray-200/50">Batch</div>
      <div className="p-3 text-left border-r border-gray-200/50">Description</div>
      <div className="p-3 text-center border-r border-gray-200/50">Reference</div>
      <div className="p-3 text-right">Amount</div>
    </div>
    <div className="min-h-[300px] rounded-b-2xl overflow-hidden bg-white divide-y divide-gray-100">
      {loading ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><RefreshCw size={32} className="animate-spin mb-3 opacity-50" /><p className="text-sm">Loading SELL data...</p></div>
        : error ? <div className="text-center py-20 text-red-500"><p className="font-medium mb-2">Unavailable</p><p className="text-xs opacity-70">{error}</p><button onClick={load} className="mt-4 px-4 py-2 bg-gray-900 text-white text-xs rounded-lg">Retry</button></div>
        : visibleRows.length === 0 ? <div className="text-center py-20 text-gray-400 text-sm">No SELL rows have columns A and H filled while column K is empty.</div>
        : visibleRows.map(row => {
          const checked = selectedRowNumber === row.sheetRowNumber;
          return <label key={row.sheetRowNumber} className={`grid grid-cols-[0.7fr_2fr_1fr_1.2fr] min-h-20 items-center text-sm cursor-pointer transition-colors ${checked ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'}`}>
            <div className="p-3 flex items-center justify-center gap-2 border-r border-gray-100"><input type="checkbox" checked={checked} onChange={() => setSelectedRowNumber(checked ? null : row.sheetRowNumber)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span>{row.batch || '-'}</span></div>
            <div className="p-3 border-r border-gray-100 text-gray-700 break-words"><div>{row.description}</div><div className="mt-1 text-[10px] font-semibold text-blue-600">{row.category}</div></div>
            <div className="p-3 border-r border-gray-100 text-center text-gray-600">{row.reference}</div>
            <div className="p-3 text-right font-semibold text-emerald-600">{formatAmount(row.amount) || row.amount || '-'}</div>
          </label>;
        })}
    </div>
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(94vw,36rem)] rounded-2xl border border-gray-200 bg-white shadow-xl px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0 text-sm text-gray-700">{selected ? `1 selected · ${selected.category}` : '0 selected'}</div>
      <button type="button" onClick={() => void issue()} disabled={!selected || processing} className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 flex items-center gap-2"><FileSpreadsheet size={16} />{processing ? 'Generating...' : 'Issue DR'}</button>
      <button type="button" onClick={() => setSelectedRowNumber(null)} disabled={!selected || processing} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Clear selection"><X size={16} /></button>
    </div>
  </>;
};

export default NewDrTable;
