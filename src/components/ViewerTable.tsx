import { RefreshCw, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { fetchSheetData, type SheetRow } from '../services/sheetService';
import RowItem from './RowItem';
import AddRowModal from './AddRowModal';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM/edit?gid=311571294#gid=311571294';
const RATES_FOLDER_URL = 'https://drive.google.com/drive/folders/1MsJRVArZGMTmqcOuCr4pvhY1-aE_HPqT?usp=drive_link';

const ViewerTable: React.FC = () => {
    const [data, setData] = useState<SheetRow[]>([]);
    const [rate, setRate] = useState<string>('0');
    const [i1Value, setI1Value] = useState<string>('0');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddRowModal, setShowAddRowModal] = useState(false);

    // Get Today's Date formatted
    const today = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchSheetData();
            setData(result.rows);
            setRate(result.rate);
            setI1Value(result.i1Value);
        } catch (err) {
            console.error(err);
            setError('Failed to load data from Google Sheets.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 my-4 sm:my-8">
            {/* Header Bar */}
            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-white/80">
                <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center gap-3">
                    <a
                        href={SHEET_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline cursor-pointer"
                    >
                        {today}
                    </a>
                    <button
                        onClick={() => setShowAddRowModal(true)}
                        className="p-1 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                        title="Add new entry"
                    >
                        <Plus size={14} />
                    </button>
                    <span className="text-gray-300 font-light">|</span>
                    <a
                        href={RATES_FOLDER_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`hover:underline cursor-pointer ${loading ? 'opacity-50 animate-pulse' : ''}`}
                    >
                        {rate}
                    </a>
                    <span className="text-gray-300 font-light">|</span>
                    <span className={`${loading ? 'opacity-50 animate-pulse' : ''}`}>{i1Value}</span>
                </h1>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Table Headers */}
            <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-[60px] z-10">
                <div className="p-3 border-r border-gray-200/50">Supplier</div>
                <div className="p-3 text-center border-r border-gray-200/50">DR</div>
                <div className="p-3 text-right border-r border-gray-200/50">RMB / PHP</div>
                <div className="p-3 text-center">CBM</div>
            </div>

            {/* Data List */}
            <div className="divide-y divide-gray-50 min-h-[300px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <RefreshCw size={32} className="animate-spin mb-3 opacity-50" />
                        <p className="text-sm">Loading inventory...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                        <p className="font-medium mb-2">Unavailable</p>
                        <p className="text-xs opacity-70">{error}</p>
                        <button onClick={loadData} className="mt-4 px-4 py-2 bg-gray-900 text-white text-xs rounded-lg">Retry</button>
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 text-sm">
                        No items found.
                    </div>
                ) : (
                    data.map((row, index) => (
                        <RowItem key={index} row={row} onImageUpdated={loadData} />
                    ))
                )}
            </div>

            {/* Add Row Modal */}
            <AddRowModal
                isOpen={showAddRowModal}
                onClose={() => setShowAddRowModal(false)}
                onRowAdded={loadData}
            />
        </div>
    );
};

export default ViewerTable;
