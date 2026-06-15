import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { fetchSummaryData, type SummaryData } from '../services/googleSheetsService';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

const SHEET_ID = '1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM';

interface SummaryPageProps {
  onBack: () => void;
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
};

export const SummaryPage: React.FC<SummaryPageProps> = ({ onBack }) => {
  const { accessToken } = useGoogleAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSummaryData(SHEET_ID);
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load summary data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 my-4 sm:my-8">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-4 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          title="Back to Viewer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">SUMMARY of accounts</h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      <div className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw size={32} className="animate-spin mb-3 opacity-50" />
            <p className="text-sm">Loading summary...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500 text-center px-4">
            <p className="font-medium mb-2">Unavailable</p>
            <p className="text-xs opacity-70 break-words">{error}</p>
            <button onClick={loadData} className="mt-4 px-4 py-2 bg-gray-900 text-white text-xs rounded-lg">Retry</button>
          </div>
        ) : data ? (
          <div className="flex flex-col text-[15px]">
            {data.items.map((item, i) => (
              <div key={i} className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="w-1/2 p-3 text-right text-gray-900 border-r border-gray-100">
                  {formatNumber(item.value)}
                </div>
                <div className="w-1/2 p-3 text-gray-900 uppercase">
                  {item.label}
                </div>
              </div>
            ))}
            
            {data.delivered !== 0 && (
              <div className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="w-1/2 p-3 text-right text-gray-900 border-r border-gray-100">
                  {formatNumber(data.delivered)}
                </div>
                <div className="w-1/2 p-3 text-gray-900">
                  Delivered, no check yet
                </div>
              </div>
            )}

            {data.notYetDelivered !== 0 && (
              <div className="flex border-b border-gray-900 border-b-[2px] hover:bg-gray-50 transition-colors">
                <div className="w-1/2 p-3 text-right text-gray-900 border-r border-gray-100">
                  {formatNumber(data.notYetDelivered)}
                </div>
                <div className="w-1/2 p-3 text-gray-900">
                  Not yet delivered, still in China
                </div>
              </div>
            )}

            <div className="flex bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <div className="w-1/2 p-3 text-right font-bold text-gray-900 border-r border-gray-100">
                {formatNumber(data.total)}
              </div>
              <div className="w-1/2 p-3 font-bold text-gray-900 uppercase">
                TOTAL
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
