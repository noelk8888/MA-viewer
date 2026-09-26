import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { fetchSupplierMonthSummaries, fetchSupplierSpecialTotals, type SupplierDateColumn, type SupplierMonthSummary, type SupplierSpecialKind, type SupplierSpecialTotals } from '../services/googleSheetsService';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

const fmt = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
const emptySpecials: SupplierSpecialTotals = {
  forCollection: { amount: 0, jkb: 0, nck: 0 },
  chinaForDr: { amount: 0, jkb: 0, nck: 0 },
};

export const SupplierSummaryPage: React.FC<{
  onBack: () => void;
  dateColumn?: SupplierDateColumn;
  cutoffDate: string;
  onCutoffDateChange: (date: string) => void;
  onMonthClick: (month: string) => void;
  onSpecialClick?: (kind: SupplierSpecialKind, label: string) => void;
  onNckClick?: () => void;
}> = ({ onBack, dateColumn = 'K', cutoffDate, onCutoffDateChange, onMonthClick, onSpecialClick, onNckClick }) => {
  const isNckSummary = dateColumn === 'O';
  const { accessToken } = useGoogleAuth();
  const [data, setData] = useState<SupplierMonthSummary[]>([]);
  const [specials, setSpecials] = useState<SupplierSpecialTotals>(emptySpecials);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [months, nextSpecials] = await Promise.all([
        fetchSupplierMonthSummaries(accessToken, cutoffDate, dateColumn),
        isNckSummary ? Promise.resolve(emptySpecials) : fetchSupplierSpecialTotals(accessToken),
      ]);
      setData(months);
      setSpecials(nextSpecials);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load supplier data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [accessToken, cutoffDate, dateColumn]);

  const specialRows = isNckSummary ? [] : [
    { kind: 'forCollection' as const, label: 'FOR COLLECTION', ...specials.forCollection },
    { kind: 'chinaForDr' as const, label: 'CHINA (for DR)', ...specials.chinaForDr },
  ];
  const total = [...data, ...specialRows].reduce((sum, item) => ({
    amount: sum.amount + item.amount,
    jkb: sum.jkb + item.jkb,
    nck: sum.nck + item.nck,
  }), { amount: 0, jkb: 0, nck: 0 });

  return <div className="w-full max-w-2xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 my-4 sm:my-8">
    <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-4 sticky top-0 z-10">
      <button type="button" onClick={onBack} className="p-2 text-gray-500"><ArrowLeft size={20}/></button>
      <h1 className="text-lg font-bold text-gray-900 flex-1">{isNckSummary ? 'NCK SUMMARY' : 'SUPPLIER SUMMARY'}</h1>
      <button type="button" onClick={() => void load()} disabled={loading} className="p-2 text-gray-500"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button>
    </div>
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50">
      <label htmlFor="supplier-cutoff" className="text-sm font-semibold text-gray-700">CUT-OFF DATE</label>
      <input id="supplier-cutoff" type="date" value={cutoffDate} onChange={(event) => onCutoffDateChange(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" />
    </div>
    {loading ? <div className="py-20 text-center text-gray-400">Loading supplier data...</div>
      : error ? <div className="py-20 text-center text-red-500">{error}</div>
        : isNckSummary ? <div className="text-[15px]">
          <div className="grid grid-cols-3 border-b border-gray-300 bg-gray-50 font-bold"><div className="p-3">MONTH</div><div className="p-3 text-right">AMOUNT</div><div className="p-3 text-right">NCK</div></div>
          {data.map((item) => <button key={item.label} type="button" onClick={() => onMonthClick(item.label)} className="grid grid-cols-3 w-full text-left border-b border-gray-100 hover:bg-blue-50"><div className="p-3 font-medium">{item.label}</div><div className="p-3 text-right">{fmt(item.amount)}</div><div className="p-3 text-right">{fmt(item.nck)}</div></button>)}
          <div className="grid grid-cols-3 bg-gray-50/50 border-t-2 border-gray-900 font-bold"><div className="p-3">TOTAL</div><div className="p-3 text-right">{fmt(total.amount)}</div><div className="p-3 text-right">{fmt(total.nck)}</div></div>
        </div> : <div className="text-[15px]">
          <div className="grid grid-cols-4 border-b border-gray-300 bg-gray-50 font-bold"><div className="p-3">MONTH</div><div className="p-3 text-right">AMOUNT</div><div className="p-3 text-right">JKB</div>{onNckClick ? <button type="button" onClick={onNckClick} className="p-3 text-right hover:text-blue-600 hover:underline">NCK</button> : <div className="p-3 text-right">NCK</div>}</div>
          {data.map((item) => <button key={item.label} type="button" onClick={() => onMonthClick(item.label)} className="grid grid-cols-4 w-full text-left border-b border-gray-100 hover:bg-blue-50"><div className="p-3 font-medium">{item.label}</div><div className="p-3 text-right">{fmt(item.amount)}</div><div className="p-3 text-right">{fmt(item.jkb)}</div><div className="p-3 text-right">{fmt(item.nck)}</div></button>)}
          {specialRows.map((item) => <button key={item.label} type="button" onClick={() => onSpecialClick?.(item.kind, item.label)} className="grid grid-cols-4 w-full text-left border-b border-gray-100 hover:bg-blue-50"><div className="p-3 font-medium">{item.label}</div><div className="p-3 text-right">{fmt(item.amount)}</div><div className="p-3 text-right">{fmt(item.jkb)}</div><div className="p-3 text-right">{fmt(item.nck)}</div></button>)}
          <div className="grid grid-cols-4 bg-gray-50/50 border-t-2 border-gray-900 font-bold"><div className="p-3">TOTAL</div><div className="p-3 text-right">{fmt(total.amount)}</div><div className="p-3 text-right">{fmt(total.jkb)}</div><div className="p-3 text-right">{fmt(total.nck)}</div></div>
        </div>}
  </div>;
};
