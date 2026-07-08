import { RefreshCw, Plus, X, TrendingUp, TrendingDown } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { fetchSheetData, type SheetRow } from '../services/sheetService';
import { generateSOA, generateBill } from '../services/googleSheetsService';
import RowItem from './RowItem';
import AddRowModal from './AddRowModal';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import { formatAppDate } from '../utils/formatters';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM/edit?gid=311571294#gid=311571294';
const RATES_FOLDER_URL = 'https://drive.google.com/drive/folders/1MsJRVArZGMTmqcOuCr4pvhY1-aE_HPqT?usp=drive_link';

interface ViewerTableProps {
  onSummaryClick?: () => void;
}

const ViewerTable: React.FC<ViewerTableProps> = ({ onSummaryClick }) => {
    const [data, setData] = useState<SheetRow[]>([]);
    const [rate, setRate] = useState<string>('0');
    const [i1Value, setI1Value] = useState<string>('0');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddRowModal, setShowAddRowModal] = useState(false);
    const [selectedYear] = useState<string>('2026');
    const [selectionModeType, setSelectionModeType] = useState<'DR_CBM' | 'SUPPLIER' | 'ISSUE_DR' | null>(null);
    const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);
    const [selectionType, setSelectionType] = useState<'DR' | 'CBM' | 'SUPPLIER' | 'ISSUE_DR' | null>(null);
    const [isProcessingSoa, setIsProcessingSoa] = useState(false);
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');

    const { accessToken, login, logout, isAuthenticated } = useGoogleAuth();

    const toggleSelectionMode = (mode: 'DR_CBM' | 'SUPPLIER' | 'ISSUE_DR') => {
        setSelectionModeType(currentMode => currentMode === mode ? null : mode);
        setSelectedRowIndices([]);
        setSelectionType(null);
    };

    // Toggle dark mode
    const toggleDarkMode = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    };

    // Get Today's Date formatted
    const today = formatAppDate(new Date().toISOString().slice(0, 10));

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchSheetData(selectedYear);
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
    }, [selectedYear]);

    useEffect(() => {
        if (!rate || rate === '0') return;
        
        try {
            const todayStr = new Date().toDateString();
            const stored = JSON.parse(localStorage.getItem('cny_rate_data') || '{"rate": "0", "previousRate": "0", "date": ""}');
            
            let prevRate = stored.previousRate;
            let currRate = stored.rate;
            
            if (rate !== currRate) {
                if (stored.date !== todayStr) {
                    prevRate = currRate;
                }
                currRate = rate;
                localStorage.setItem('cny_rate_data', JSON.stringify({ rate: currRate, previousRate: prevRate, date: todayStr }));
            } else if (stored.date !== todayStr) {
                localStorage.setItem('cny_rate_data', JSON.stringify({ rate: currRate, previousRate: prevRate, date: todayStr }));
            }
            
            const currNum = parseFloat(currRate.replace(/,/g, ''));
            const prevNum = parseFloat(prevRate.replace(/,/g, ''));
            
            if (!isNaN(prevNum) && prevNum > 0 && !isNaN(currNum)) {
                if (currNum > prevNum) setTrend('up');
                else if (currNum < prevNum) setTrend('down');
                else setTrend('neutral');
            }
        } catch (e) {
            console.error('Error tracking rate history', e);
        }
    }, [rate]);

    return (
        <div className="w-full max-w-2xl mx-auto bg-white shadow-xl rounded-2xl border border-gray-100 my-4 sm:my-8 relative">
            {/* Header Bar */}
            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-white/80 rounded-t-2xl shadow-sm">
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
                    <span className="flex items-center gap-1">
                        <a
                            href={RATES_FOLDER_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`hover:underline cursor-pointer ${loading ? 'opacity-50 animate-pulse' : ''}`}
                        >
                            {rate}
                        </a>
                        {trend === 'up' && <TrendingUp size={16} className="text-green-500" />}
                        {trend === 'down' && <TrendingDown size={16} className="text-red-500" />}
                    </span>
                    <span className="text-gray-300 font-light">|</span>
                    <span 
                        className={`${loading ? 'opacity-50 animate-pulse' : ''} hover:underline cursor-pointer`}
                        onClick={onSummaryClick}
                    >
                        {i1Value}
                    </span>
                </h1>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Year Tabs */}
            <div className="flex border-b border-gray-200 bg-white sticky top-[60px] z-20 shadow-sm">
                <button
                    onClick={() => toggleSelectionMode('SUPPLIER')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        selectionModeType === 'SUPPLIER'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    title="Toggle Supplier Selection Mode"
                >
                    GenBill
                </button>
                <button
                    onClick={() => toggleSelectionMode('ISSUE_DR')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        selectionModeType === 'ISSUE_DR'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    title="Select an entry to issue a DR"
                >
                    Issue DR
                </button>
                <button
                    onClick={() => toggleSelectionMode('DR_CBM')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        selectionModeType === 'DR_CBM'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    title="Toggle DR Selection Mode"
                >
                    Issue SOA
                </button>
                <button
                    onClick={toggleDarkMode}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        isDark
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    title="Toggle dark mode"
                >
                    {isDark ? 'DARK' : 'LIGHT'}
                </button>
            </div>

            {/* Table Headers */}
            <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-[97px] z-20 shadow-sm">
                <div className="p-3 border-r border-gray-200/50">
                    Supplier
                </div>
                <div className="p-3 text-center border-r border-gray-200/50">
                    DR
                </div>
                <div className="p-3 text-right border-r border-gray-200/50">RMB / PHP</div>
                <div className="p-3 text-center">CBM</div>
            </div>

            {/* Data List */}
            <div className="divide-y divide-gray-50 min-h-[300px] rounded-b-2xl overflow-hidden bg-white">
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
                        <RowItem 
                            key={index} 
                            row={row} 
                            onImageUpdated={loadData} 
                            selectedYear={selectedYear} 
                            selectionModeType={selectionModeType}
                            isSelected={selectedRowIndices.includes(row.originalIndex)}
                            selectionType={selectionType}
                            selectedCount={selectedRowIndices.length}
                            onToggleSelect={(rowIndex, type) => {
                                setSelectedRowIndices(prev => {
                                    const isSelected = prev.includes(rowIndex);
                                    const selectionLimit = selectionModeType === 'ISSUE_DR' ? 1 : 3;
                                    
                                    if (!isSelected && prev.length >= selectionLimit) {
                                        alert(selectionModeType === 'ISSUE_DR'
                                            ? "You can only select one entry to issue a DR."
                                            : "You can only select up to 3 items.");
                                        return prev;
                                    }

                                    const newSelection = isSelected 
                                        ? prev.filter(i => i !== rowIndex)
                                        : [...prev, rowIndex];
                                    
                                    if (newSelection.length === 0) {
                                        setSelectionType(null);
                                    } else {
                                        setSelectionType(type);
                                    }
                                    return newSelection;
                                });
                            }}
                        />
                    ))
                )}
            </div>

            {/* Add Row Modal */}
            <AddRowModal
                isOpen={showAddRowModal}
                onClose={() => setShowAddRowModal(false)}
                onRowAdded={loadData}
                selectedYear={selectedYear}
            />

            {/* Floating Action Bar */}
            {selectionModeType && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        {selectedRowIndices.length} selected
                    </span>
                    <div className="w-px h-6 bg-gray-200"></div>
                    {selectionModeType === 'DR_CBM' ? (
                        <>
                            <button
                                onClick={async () => {
                                    if (!isAuthenticated || !accessToken) {
                                        alert("Please sign in with Google to issue an SOA.");
                                        login();
                                        return;
                                    }
                                    
                                    const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
                                    if (!sheetId) {
                                        alert("Sheet ID not configured.");
                                        return;
                                    }

                                    if (selectionType !== 'DR' && selectionType !== 'CBM') return;

                                    try {
                                        setIsProcessingSoa(true);
                                        const selectedRowsData = selectedRowIndices.map(id => 
                                            data.find(r => r.originalIndex === id)
                                        ).filter(Boolean);
                                        
                                        await generateSOA(accessToken, sheetId, selectedRowsData, selectionType);
                                        
                                        // Open SOA tab
                                        window.open('https://docs.google.com/spreadsheets/d/1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM/edit?gid=1049592506', '_blank');
                                        
                                        setSelectionModeType(null);
                                        setSelectedRowIndices([]);
                                        setSelectionType(null);
                                    } catch (err: any) {
                                        alert("Error generating SOA: " + err.message);
                                        if (err.message.includes('expired')) {
                                            logout();
                                            login();
                                        }
                                    } finally {
                                        setIsProcessingSoa(false);
                                    }
                                }}
                                disabled={selectedRowIndices.length === 0 || isProcessingSoa}
                                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {isProcessingSoa ? 'PROCESSING...' : 'ISSUE SOA'}
                            </button>
                            <button
                                onClick={async () => {
                                    if (!isAuthenticated || !accessToken) {
                                        alert("Please sign in with Google to print the SOA.");
                                        login();
                                        return;
                                    }
                                    
                                    const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
                                    if (!sheetId) {
                                        alert("Sheet ID not configured.");
                                        return;
                                    }

                                    if (selectionType !== 'DR' && selectionType !== 'CBM') return;

                                    try {
                                        setIsProcessingSoa(true);
                                        const selectedRowsData = selectedRowIndices.map(id => 
                                            data.find(r => r.originalIndex === id)
                                        ).filter(Boolean);
                                        
                                        await generateSOA(accessToken, sheetId, selectedRowsData, selectionType);
                                        
                                        // Open PDF export for printing (A1:D35) fitted to A4 without gridlines
                                        window.open('https://docs.google.com/spreadsheets/d/1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM/export?format=pdf&gid=1049592506&range=A1:D35&size=A4&portrait=true&scale=4&gridlines=false', '_blank');
                                        
                                        setSelectionModeType(null);
                                        setSelectedRowIndices([]);
                                        setSelectionType(null);
                                    } catch (err: any) {
                                        alert("Error printing SOA: " + err.message);
                                        if (err.message.includes('expired')) {
                                            logout();
                                            login();
                                        }
                                    } finally {
                                        setIsProcessingSoa(false);
                                    }
                                }}
                                disabled={selectedRowIndices.length === 0 || isProcessingSoa}
                                className="px-4 py-1.5 bg-gray-800 text-white text-sm font-medium rounded-full hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                PRINT
                            </button>
                        </>
                    ) : selectionModeType === 'SUPPLIER' ? (
                        <button
                            onClick={async () => {
                                if (!isAuthenticated || !accessToken) {
                                    alert("Please sign in with Google to generate a bill.");
                                    login();
                                    return;
                                }
                                
                                const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
                                if (!sheetId) {
                                    alert("Sheet ID not configured.");
                                    return;
                                }

                                try {
                                    setIsProcessingSoa(true);
                                    const selectedRowsData = selectedRowIndices.map(id => 
                                        data.find(r => r.originalIndex === id)
                                    ).filter(Boolean);
                                    
                                    // PUSH DATA - Implement generateBill in googleSheetsService
                                    await generateBill(accessToken, sheetId, selectedRowsData, selectedYear);
                                    
                                    window.open('https://docs.google.com/spreadsheets/d/1azRoUDoaCwqpzIftBMrCWGkURmkdLmfdMVJfTkQh3hM/edit?gid=837323267#gid=837323267', '_blank');
                                    
                                    setSelectionModeType(null);
                                    setSelectedRowIndices([]);
                                    setSelectionType(null);
                                } catch (err: any) {
                                    alert("Error generating bill: " + err.message);
                                } finally {
                                    setIsProcessingSoa(false);
                                }
                            }}
                            disabled={selectedRowIndices.length === 0 || isProcessingSoa}
                            className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {isProcessingSoa ? 'PROCESSING...' : 'GENERATE BILL'}
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                const rowNumber = selectedRowIndices[0];
                                if (!rowNumber) return;

                                window.open(`https://drsheet.vercel.app/?row=${rowNumber}`, '_blank');
                                setSelectionModeType(null);
                                setSelectedRowIndices([]);
                                setSelectionType(null);
                            }}
                            disabled={selectedRowIndices.length !== 1}
                            className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            ISSUE DR
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setSelectionModeType(null);
                            setSelectedRowIndices([]);
                            setSelectionType(null);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors ml-2"
                        title="Cancel Selection Mode"
                        disabled={isProcessingSoa}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ViewerTable;
