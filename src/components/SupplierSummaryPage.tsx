import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { fetchSupplierMonthSummaries, type SupplierMonthSummary } from '../services/googleSheetsService';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

const fmtAmount = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtWhole = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

export const SupplierSummaryPage: React.FC<{ onBack: () => void; onMonthClick: (month: string) => void }> = ({ onBack, onMonthClick }) => {
  const { accessToken } = useGoogleAuth();
  const [data, setData] = useState<SupplierMonthSummary[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = async () => { if (!accessToken) return; setLoading(true); setError(null); try { setData(await fetchSupplierMonthSummaries(accessToken)); } catch (e: any) { setError(e.message || 'Failed to load supplier data'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [accessToken]);
  const total = data.reduce((s, x) => ({ amount: s.amount + x.amount, jkb: s.jkb + x.jkb, nck: s.nck + x.nck }), { amount: 0, jkb: 0, nck: 0 });
  return <div className="w-full max-w-2xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 my-4 sm:my-8">
    <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-4 sticky top-0 z-10"><button onClick={onBack} className="p-2 text-gray-500"><ArrowLeft size={20}/></button><h1 className="text-lg font-bold text-gray-900 flex-1">SUPPLIER SUMMARY</h1><button onClick={load} disabled={loading} className="p-2 text-gray-500"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button></div>
    {loading ? <div className="py-20 text-center text-gray-400">Loading supplier data...</div> : error ? <div className="py-20 text-center text-red-500">{error}</div> : <div className="text-[15px]"><div className="grid grid-cols-4 border-b border-gray-300 bg-gray-50 font-bold"><div className="p-3">MONTH</div><div className="p-3 text-right">AMOUNT</div><div className="p-3 text-right">JKB</div><div className="p-3 text-right">NCK</div></div>{data.map((item) => <button key={item.label} onClick={() => onMonthClick(item.label)} className="grid grid-cols-4 w-full text-left border-b border-gray-100 hover:bg-blue-50"><div className="p-3 font-medium">{item.label}</div><div className="p-3 text-right">{fmtAmount(item.amount)}</div><div className="p-3 text-right">{fmtWhole(item.jkb)}</div><div className="p-3 text-right">{fmtWhole(item.nck)}</div></button>)}<div className="grid grid-cols-4 bg-gray-50/50 border-t-2 border-gray-900 font-bold"><div className="p-3">TOTAL</div><div className="p-3 text-right">{fmtAmount(total.amount)}</div><div className="p-3 text-right">{fmtWhole(total.jkb)}</div><div className="p-3 text-right">{fmtWhole(total.nck)}</div></div></div>}
  </div>;
};
