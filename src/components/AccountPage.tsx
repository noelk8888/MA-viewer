import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { fetchAccountData, type AccountData } from '../services/googleSheetsService';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

interface AccountPageProps { onBack: () => void; }
const formatNumber = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

export const AccountPage: React.FC<AccountPageProps> = ({ onBack }) => {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useGoogleAuth();
  const loadData = async () => {
    setLoading(true); setError(null);
    if (!accessToken) return;
    try { setData(await fetchAccountData(accessToken)); } catch (err: any) { setError(err.message || 'Failed to load account data'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, [accessToken]);
  const cell = 'p-3 border-r border-gray-100 text-right';
  return <div className="w-full max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 my-4 sm:my-8">
    <div className="p-4 border-b border-gray-100 flex items-center gap-4 sticky top-0 z-10 backdrop-blur-md bg-white/80">
      <button onClick={onBack} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></button>
      <h1 className="text-lg font-bold text-gray-900 flex-1">SUMMARY of account</h1>
      <button onClick={loadData} disabled={loading} className="p-2 text-gray-500 hover:text-blue-600 rounded-lg"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
    </div>
    {loading ? <div className="py-20 text-center text-gray-400"><RefreshCw size={32} className="animate-spin mx-auto mb-3" />Loading account data...</div> : error ? <div className="py-20 text-center text-red-500">{error}<button onClick={loadData} className="block mx-auto mt-4 px-4 py-2 bg-gray-900 text-white text-xs rounded-lg">Retry</button></div> : data && <div className="text-[15px] overflow-x-auto">
      <div className="grid grid-cols-5 border-b border-gray-300 bg-gray-50 font-bold min-w-[620px]"><div className="p-3 border-r border-gray-100">MONTH</div><div className="p-3 text-center border-r border-gray-100">TOTAL</div><div className="p-3 text-center border-r border-gray-100">SM</div><div className="p-3 text-center border-r border-gray-100">MARLON</div><div className="p-3 text-center">MARILU</div></div>
      {[...data.items, data.total].map(item => <div key={item.label} className={`grid grid-cols-5 min-w-[620px] border-b border-gray-100 ${item.label === 'TOTAL' ? 'bg-gray-50/50 font-bold border-t-2 border-gray-300' : ''}`}><div className="p-3 border-r border-gray-100">{item.label}</div><div className={cell}>{formatNumber(item.total)}</div><div className={cell}>{formatNumber(item.sm)}</div><div className={cell}>{formatNumber(item.marlon)}</div><div className="p-3 text-right">{formatNumber(item.marilu)}</div></div>)}
    </div>}
  </div>;
};
