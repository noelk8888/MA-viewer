import { RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import NewMenuTable from './NewMenuTable';
import NewSoaTable from './NewSoaTable';
import NewDrTable from './NewDrTable';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import { formatAppDate } from '../utils/formatters';
import { fetchNewSeriesHeader } from '../services/newMenuService';

interface ViewerTableProps {
  onSupplierClick?: () => void;
  initialNewMenu?: boolean;
}

type NewSection = 'newgenbill' | 'newdr' | 'newsoa' | null;

const RATE_CACHE_KEY = 'new_series_cny_rate_data';
const isValidRate = (value: string) => Number.isFinite(Number(value.replace(/,/g, ''))) && Number(value.replace(/,/g, '')) > 0;

const ViewerTable: React.FC<ViewerTableProps> = ({ onSupplierClick }) => {
  const { accessToken } = useGoogleAuth();
  const [section, setSection] = useState<NewSection>(null);
  const [rate, setRate] = useState(() => localStorage.getItem(RATE_CACHE_KEY) || '0');
  const [total, setTotal] = useState('0');
  const [headerLoading, setHeaderLoading] = useState(true);
  const [contentKey, setContentKey] = useState(0);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');

  const loadHeader = useCallback(async () => {
    if (!accessToken) {
      setHeaderLoading(false);
      return;
    }
    setHeaderLoading(true);
    try {
      const next = await fetchNewSeriesHeader(accessToken);
      setTotal(next.total || '0');
      if (isValidRate(next.rate)) {
        const previous = localStorage.getItem(RATE_CACHE_KEY) || '';
        if (isValidRate(previous)) {
          const previousNumber = Number(previous.replace(/,/g, ''));
          const nextNumber = Number(next.rate.replace(/,/g, ''));
          setTrend(nextNumber > previousNumber ? 'up' : nextNumber < previousNumber ? 'down' : 'neutral');
        }
        setRate(next.rate);
        localStorage.setItem(RATE_CACHE_KEY, next.rate);
      }
    } catch (error) {
      console.error('Failed to load BUY header values', error);
    } finally {
      setHeaderLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void loadHeader(); }, [loadHeader]);

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  const selectSection = (next: Exclude<NewSection, null>) => {
    setSection(current => current === next ? null : next);
  };

  const refresh = () => {
    void loadHeader();
    setContentKey(value => value + 1);
  };

  const today = formatAppDate(new Date().toISOString().slice(0, 10));

  return (
    <div className="w-full max-w-2xl mx-auto bg-white shadow-xl rounded-2xl border border-gray-100 my-4 sm:my-8 relative">
      <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md bg-white/80 rounded-t-2xl shadow-sm">
        <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center gap-3">
          <span>{today}</span>
          <span className="text-gray-300 font-light">|</span>
          <span className={`flex items-center gap-1 ${headerLoading ? 'opacity-50 animate-pulse' : ''}`} title="CNY/PHP from BUY H1">
            {rate}
            {trend === 'up' && <TrendingUp size={16} className="text-green-500" />}
            {trend === 'down' && <TrendingDown size={16} className="text-red-500" />}
          </span>
          <span className="text-gray-300 font-light">|</span>
          <button type="button" onClick={onSupplierClick} className={`${headerLoading ? 'opacity-50 animate-pulse' : ''} hover:underline cursor-pointer`} title="Open supplier summary">
            {total}
          </button>
        </h1>
        <button type="button" onClick={refresh} disabled={headerLoading} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Refresh">
          <RefreshCw size={20} className={headerLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex border-b border-gray-200 bg-white sticky top-[60px] z-20 shadow-sm">
        <button type="button" onClick={() => selectSection('newgenbill')} className={`flex-1 py-3 text-sm font-medium transition-colors ${section === 'newgenbill' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>NEW GENBILL</button>
        <button type="button" onClick={() => selectSection('newdr')} className={`flex-1 py-3 text-sm font-medium transition-colors ${section === 'newdr' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>NEW DR</button>
        <button type="button" onClick={() => selectSection('newsoa')} className={`flex-1 py-3 text-sm font-medium transition-colors ${section === 'newsoa' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>NEW SOA</button>
        <button type="button" onClick={toggleDarkMode} className={`flex-1 py-3 text-sm font-medium transition-colors ${isDark ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>DARK</button>
      </div>

      {section === 'newdr' ? <NewDrTable key={`dr-${contentKey}`} />
        : section === 'newsoa' ? <NewSoaTable key={`soa-${contentKey}`} />
          : <NewMenuTable key={`${section ?? 'menu'}-${contentKey}`} generationMode={section === 'newgenbill' ? 'newgenbill' : null} onSupplierClick={onSupplierClick} />}
    </div>
  );
};

export default ViewerTable;
