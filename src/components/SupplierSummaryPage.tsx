import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { fetchSummaryData, fetchSupplierMonthSummaries, type SummaryData, type SupplierDateColumn, type SupplierMonthSummary } from '../services/googleSheetsService';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

const fmtAmount = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtWhole = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

const SHEET_ID = '1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM';

export const SupplierSummaryPage: React.FC<{
  onBack: () => void;
  dateColumn?: SupplierDateColumn;
  cutoffDate: string;
  onCutoffDateChange: (date: string) => void;
  onMonthClick: (month: string) => void;
  onSpecialClick: (index: number, label: 'DR' | 'CHINA') => void;
  onNckClick?: () => void;
}> = ({ onBack, dateColumn = 'K', cutoffDate, onCutoffDateChange, onMonthClick, onSpecialClick, onNckClick }) => {
  const isNckSummary = dateColumn === 'O';
  const { accessToken } = useGoogleAuth();
  const [data, setData] = useState<SupplierMonthSummary[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<SummaryData | null>(null);
  const load = async () => { if (!accessToken) return; setLoading(true); setError(null); try { const [months, accounts] = await Promise.all([fetchSupplierMonthSummaries(accessToken, cutoffDate, dateColumn), isNckSummary ? Promise.resolve(null) : fetchSummaryData(SHEET_ID)]); setData(months); setAccountData(accounts); } catch (e: any) { setError(e.message || 'Failed to load supplier data'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [accessToken, cutoffDate, dateColumn]);
  const specialRows = !isNckSummary && accountData ? [
    { label: 'FOR DR', detailLabel: 'DR' as const, index: -1, jkb: accountData.dr.jkb, nck: accountData.dr.nck },
    { label: 'CHINA', detailLabel: 'CHINA' as const, index: -2, jkb: accountData.china.jkb, nck: accountData.china.nck },
  ] : [];
  const total = [...data.map(({ amount, jkb, nck }) => ({ amount, jkb, nck })), ...specialRows.map(({ jkb, nck }) => ({ amount: jkb + nck, jkb, nck }))]
    .reduce((s, x) => ({ amount: s.amount + x.amount, jkb: s.jkb + x.jkb, nck: s.nck + x.nck }), { amount: 0, jkb: 0, nck: 0 });
  return <div className="w-full max-w-2xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 my-4 sm:my-8">
    <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-4 sticky top-0 z-10"><button onClick={onBack} className="p-2 text-gray-500"><ArrowLeft size={20}/></button><h1 className="text-lg font-bold text-gray-900 flex-1">{isNckSummary ? 'NCK SUMMARY' : 'SUPPLIER SUMMARY'}</h1><button onClick={load} disabled={loading} className="p-2 text-gray-500"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button></div>
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50"><label htmlFor="supplier-cutoff" className="text-sm font-semibold text-gray-700">CUT-OFF DATE</label><input id="supplier-cutoff" type="date" value={cutoffDate} onChange={(event) => onCutoffDateChange(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" /></div>
    {loading ? <div className="py-20 text-center text-gray-400">Loading supplier data...</div> : error ? <div className="py-20 text-center text-red-500">{error}</div> : isNckSummary ? <div className="text-[15px]"><div className="grid grid-cols-3 border-b border-gray-300 bg-gray-50 font-bold"><div className="p-3">MONTH</div><div className="p-3 text-right">AMOUNT</div><div className="p-3 text-right">NCK</div></div>{data.map((item) => <button key={item.label} onClick={() => onMonthClick(item.label)} className="grid grid-cols-3 w-full text-left border-b border-gray-100 hover:bg-blue-50"><div className="p-3 font-medium">{item.label}</div><div className="p-3 text-right">{fmtAmount(item.amount)}</div><div className="p-3 text-right">{fmtWhole(item.nck)}</div></button>)}<div className="grid grid-cols-3 bg-gray-50/50 border-t-2 border-gray-900 font-bold"><div className="p-3">TOTAL</div><div className="p-3 text-right">{fmtAmount(total.amount)}</div><div className="p-3 text-right">{fmtWhole(total.nck)}</div></div></div> : <div className="text-[15px]"><div className="grid grid-cols-4 border-b border-gray-300 bg-gray-50 font-bold"><div className="p-3">MONTH</div><div className="p-3 text-right">AMOUNT</div><div className="p-3 text-right">JKB</div>{onNckClick ? <button type="button" onClick={onNckClick} className="p-3 text-right hover:text-blue-600 hover:underline" title="Open NCK summary by column O date">NCK</button> : <div className="p-3 text-right">NCK</div>}</div>{data.map((item) => <button key={item.label} onClick={() => onMonthClick(item.label)} className="grid grid-cols-4 w-full text-left border-b border-gray-100 hover:bg-blue-50"><div className="p-3 font-medium">{item.label}</div><div className="p-3 text-right">{fmtAmount(item.amount)}</div><div className="p-3 text-right">{fmtWhole(item.jkb)}</div><div className="p-3 text-right">{fmtWhole(item.nck)}</div></button>)}{specialRows.map((item) => <button key={item.label} onClick={() => onSpecialClick(item.index, item.detailLabel)} className="grid grid-cols-4 w-full text-left border-b border-gray-100 hover:bg-blue-50"><div className="p-3 font-medium">{item.label}</div><div className="p-3 text-right">{fmtAmount(item.jkb + item.nck)}</div><div className="p-3 text-right">{fmtWhole(item.jkb)}</div><div className="p-3 text-right">{fmtWhole(item.nck)}</div></button>)}<div className="grid grid-cols-4 bg-gray-50/50 border-t-2 border-gray-900 font-bold"><div className="p-3">TOTAL</div><div className="p-3 text-right">{fmtAmount(total.amount)}</div><div className="p-3 text-right">{fmtWhole(total.jkb)}</div><div className="p-3 text-right">{fmtWhole(total.nck)}</div></div></div>}
  </div>;
};
