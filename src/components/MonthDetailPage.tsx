import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { fetchMonthDetailData, type MonthDetailData } from '../services/googleSheetsService';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

const SHEET_ID = '1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM';

interface MonthDetailPageProps {
  monthIndex: number;
  monthLabel: string;
  onBack: () => void;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

export const MonthDetailPage: React.FC<MonthDetailPageProps> = ({
  monthIndex,
  monthLabel,
  onBack,
}) => {
  const { accessToken } = useGoogleAuth();
  const [data, setData] = useState<MonthDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      setData(await fetchMonthDetailData(SHEET_ID, monthIndex, monthLabel));
    } catch (err: any) {
      setError(err.message || 'Failed to load monthly details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken, monthIndex, monthLabel]);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 my-4 sm:my-8">
      <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-4 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          title="Back to Summary"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 uppercase">{monthLabel}</h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          title="Refresh"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <RefreshCw size={32} className="animate-spin mb-3 opacity-50" />
          <p className="text-sm">Loading monthly details...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500 text-center px-4">
          <p className="font-medium mb-2">Unavailable</p>
          <p className="text-xs opacity-70 break-words">{error}</p>
          <button onClick={loadData} className="mt-4 px-4 py-2 bg-gray-900 text-white text-xs rounded-lg">
            Retry
          </button>
        </div>
      ) : data ? (
        <div className="flex flex-col text-[15px]">
          {monthLabel === 'CHINA' ? (
            <div className="flex border-b border-gray-300 bg-gray-50 font-bold">
              <div className="w-1/3 p-3 text-center border-r border-gray-100">DATE</div>
              <div className="w-1/3 p-3 text-center border-r border-gray-100">J2N</div>
              <div className="w-1/3 p-3 text-center">JKB</div>
            </div>
          ) : (
            <div className="flex border-b border-gray-300 bg-gray-50 font-bold">
              <div className="w-1/4 p-3 text-center border-r border-gray-100">DATE</div>
              <div className="w-1/4 p-3 text-center border-r border-gray-100">J2N</div>
              <div className="w-1/4 p-3 text-center border-r border-gray-100">JKB</div>
              <div className="w-1/4 p-3 text-center">NCK</div>
            </div>
          )}

          {data.items.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">No monthly details found.</div>
          ) : (
            data.items.map((item, index) => (
              <div key={item.sourceRow + '-' + index} className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors">
                {monthLabel === 'CHINA' ? (
                  <>
                    <div className="w-1/3 p-3 text-center text-gray-900 border-r border-gray-100 font-medium">
                      {item.date}
                    </div>
                    <div className="w-1/3 p-3 text-right text-gray-900 border-r border-gray-100">
                      {formatNumber(item.j2n)}
                    </div>
                    <div className="w-1/3 p-3 text-right text-gray-900">
                      {formatNumber(item.jkb)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-1/4 p-3 text-center text-gray-900 border-r border-gray-100 font-medium">
                      {item.date}
                    </div>
                    <div className="w-1/4 p-3 text-right text-gray-900 border-r border-gray-100">
                      {formatNumber(item.j2n)}
                    </div>
                    <div className="w-1/4 p-3 text-right text-gray-900 border-r border-gray-100">
                      {formatNumber(item.jkb)}
                    </div>
                    <div className="w-1/4 p-3 text-right text-gray-900">
                      {formatNumber(item.nck)}
                    </div>
                  </>
                )}
              </div>
            ))
          )}

          <div className="flex bg-gray-50/50 border-t-2 border-gray-900">
            {monthLabel === 'CHINA' ? (
              <>
                <div className="w-1/3 p-3 font-bold text-gray-900 border-r border-gray-100">TOTAL</div>
                <div className="w-1/3 p-3 text-right font-bold text-gray-900 border-r border-gray-100">{formatNumber(data.total.j2n)}</div>
                <div className="w-1/3 p-3 text-right font-bold text-gray-900">{formatNumber(data.total.jkb)}</div>
              </>
            ) : (
              <>
                <div className="w-1/4 p-3 font-bold text-gray-900 border-r border-gray-100">TOTAL</div>
                <div className="w-1/4 p-3 text-right font-bold text-gray-900 border-r border-gray-100">{formatNumber(data.total.j2n)}</div>
                <div className="w-1/4 p-3 text-right font-bold text-gray-900 border-r border-gray-100">{formatNumber(data.total.jkb)}</div>
                <div className="w-1/4 p-3 text-right font-bold text-gray-900">{formatNumber(data.total.nck)}</div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
