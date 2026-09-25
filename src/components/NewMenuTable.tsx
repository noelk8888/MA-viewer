import React, { useCallback, useEffect, useState } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import Modal from './Modal';
import ImageUploadModal from './ImageUploadModal';
import { fetchNewMenuRows, generateBuyRows, GEN_BUY_GID, GEN_SELL_GID, NEW_MENU_GID, NEW_MENU_SHEET_ID, type NewMenuRow } from '../services/newMenuService';
import { generateSellRows } from '../services/genSellService';
import { formatAmount, toIsoDate } from '../utils/formatters';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

const imageId = (link: string) => link.match(/[?&]id=([\w-]+)/)?.[1]
  || link.match(/\/file\/d\/([\w-]+)/)?.[1]
  || link.match(/\/d\/([\w-]+)/)?.[1];

const displayDate = (value: string): string => {
  const iso = toIsoDate(value);
  if (!iso) return value || '-';
  const [year, month, day] = iso.split('-');
  const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month) - 1];
  return `${day}-${monthName}-${year}`;
};

const product = (...values: string[]): string => {
  if (values.some(value => !value.trim())) return '-';
  const parsed = values.map(value => Number(value.replace(/,/g, '').trim()));
  return parsed.every(Number.isFinite) ? formatAmount(parsed.reduce((result, value) => result * value, 1)) : '-';
};

const NewMenuImage: React.FC<{
  link: string;
  label: string;
  column: 'F' | 'H';
  rowNumber: number;
  onUpdated: () => void;
}> = ({ link, label, column, rowNumber, onUpdated }) => {
  const [showImage, setShowImage] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const id = imageId(link);

  return <>
    <button type="button" onClick={() => setShowImage(true)} title={`View ${label}`} className="flex items-center justify-center hover:scale-105 transition-transform">
      {id && !thumbFailed ? (
        <img src={`https://lh3.googleusercontent.com/d/${id}=s200`} alt={label} className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg shadow-sm border border-gray-200" referrerPolicy="no-referrer" loading="lazy" onError={() => setThumbFailed(true)} />
      ) : (
        <span className={`p-3 rounded-xl shadow-sm ${link ? 'text-blue-600 bg-blue-50' : 'text-gray-300 bg-gray-50'}`}><FileText size={20} /></span>
      )}
    </button>
    <Modal isOpen={showImage} onClose={() => setShowImage(false)} title={label} content={link} onUpload={() => { setShowImage(false); setShowUpload(true); }} />
    {showUpload && <ImageUploadModal
      isOpen
      onClose={() => setShowUpload(false)}
      imageType={column === 'F' ? 'DR' : 'CBM'}
      imageLabel={label}
      sheetRowNumber={rowNumber}
      selectedYear="2026"
      targetSheet={{ spreadsheetId: NEW_MENU_SHEET_ID, gid: NEW_MENU_GID, column }}
      onUploadComplete={() => { onUpdated(); setShowUpload(false); }}
    />}
  </>;
};

const NewMenuItem: React.FC<{
  row: NewMenuRow;
  onUpdated: () => void;
  generationMode: 'newgenbill' | null;
  selected: boolean;
  onToggle: () => void;
}> = ({ row, onUpdated, generationMode, selected, onToggle }) => (
  <div className="grid grid-cols-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors min-h-28">
    <div className="p-3 flex flex-col justify-center gap-1 border-r border-gray-100/50 min-w-0 text-xs sm:text-sm">
      {generationMode && <label className="flex items-center gap-2 mb-1 text-blue-600 cursor-pointer"><input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${row.reference || row.supplier} for NewGenBill`} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-xs">NewGenBill</span></label>}
      <div className="text-sm sm:text-base text-gray-600">{displayDate(row.date)}</div>
      <div className="text-gray-600 break-words">{row.reference || '-'}</div>
      <div className="font-bold text-emerald-600 break-words">{product(row.amountCny, row.sellRate, '1.05')}</div>
    </div>
    <div className="p-2 flex items-center justify-center border-r border-gray-100/50">
      <NewMenuImage link={row.firstImage} label="Items DR" column="F" rowNumber={row.sheetRowNumber} onUpdated={onUpdated} />
    </div>
    <div className="p-3 flex flex-col justify-center gap-1 border-r border-gray-100/50 bg-gray-50/30 min-w-0 text-xs sm:text-sm">
      <div className="text-gray-600 break-words">{row.supplier || '-'}</div>
      <div className="text-gray-600 break-words">{row.reference || '-'}</div>
      <div className="font-bold text-emerald-600 break-words">{product(row.cbmSellPrice, row.cbm)}</div>
    </div>
    <div className="p-2 flex items-center justify-center">
      <NewMenuImage link={row.secondImage} label="CBM DR" column="H" rowNumber={row.sheetRowNumber} onUpdated={onUpdated} />
    </div>
  </div>
);

const NewMenuTable: React.FC<{ generationMode: 'newgenbill' | null }> = ({ generationMode }) => {
  const { accessToken, login } = useGoogleAuth();
  const [rows, setRows] = useState<NewMenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setRows(await fetchNewMenuRows()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Failed to load New Menu data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleSelected = (rowNumber: number) => {
    setGenerationError(null);
    setGenerationStatus(null);
    setSelectedRowNumbers(current => current.includes(rowNumber)
      ? current.filter(value => value !== rowNumber)
      : [...current, rowNumber]);
  };

  const generate = async () => {
    if (!accessToken || selectedRowNumbers.length === 0 || generating) return;
    setGenerating(true);
    setGenerationError(null);
    setGenerationStatus('Preparing NewGenBill...');
    let buyCompleted = false;
    try {
      const freshRows = await fetchNewMenuRows();
      const selected = freshRows.filter(row => selectedRowNumbers.includes(row.sheetRowNumber));
      if (selected.length !== selectedRowNumbers.length) throw new Error('Some selected rows changed. Refresh and select them again.');
      if (selected.some(row => rows.find(original => original.sheetRowNumber === row.sheetRowNumber)?.reference !== row.reference)) {
        throw new Error('Some selected rows moved or changed. Refresh and select them again.');
      }
      const buyCount = await generateBuyRows(accessToken, selected);
      buyCompleted = true;
      setGenerationStatus(`GenBUY done: ${buyCount} row${buyCount === 1 ? '' : 's'} generated. Proceeding to GenSELL...`);
      await new Promise(resolve => window.setTimeout(resolve, 0));
      const sellCount = await generateSellRows(accessToken, selected);
      setGenerationStatus(`GenSELL done: ${sellCount} rows generated. NewGenBill complete. GenBUY: ${buyCount} rows. GenSELL: ${sellCount} rows.`);
      setSelectedRowNumbers([]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not generate rows.';
      setGenerationError(buyCompleted
        ? `GenBUY completed, but GenSELL failed: ${message}`
        : message);
    } finally {
      setGenerating(false);
    }
  };

  return <>
    <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-[137px] z-20 shadow-sm">
      <div className="p-3 border-r border-gray-200/50 text-left">Date</div>
      <div className="p-3 border-r border-gray-200/50 text-center">Items DR</div>
      <div className="p-3 border-r border-gray-200/50 text-left">Supplier</div>
      <div className="p-3 text-center">CBM DR</div>
    </div>
    <div className="divide-y divide-gray-50 min-h-[300px] rounded-b-2xl overflow-hidden bg-white">
      {loading ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><RefreshCw size={32} className="animate-spin mb-3 opacity-50" /><p className="text-sm">Loading New Menu...</p></div>
        : error ? <div className="text-center py-20 text-red-500"><p className="font-medium mb-2">Unavailable</p><p className="text-xs opacity-70">{error}</p><button onClick={load} className="mt-4 px-4 py-2 bg-gray-900 text-white text-xs rounded-lg">Retry</button></div>
        : rows.length === 0 ? <div className="text-center py-20 text-gray-400 text-sm">No items found.</div>
        : rows.map(row => <NewMenuItem key={row.sheetRowNumber} row={row} onUpdated={load} generationMode={generationMode} selected={selectedRowNumbers.includes(row.sheetRowNumber)} onToggle={() => toggleSelected(row.sheetRowNumber)} />)}
    </div>
    {generationMode && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(90vw,36rem)] rounded-2xl border border-gray-200 bg-white shadow-xl px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0 text-sm text-gray-700">
        {generationError ? <span className="text-red-600">{generationError}</span>
          : generationStatus ? <span className={generationStatus.includes('complete') ? 'text-green-700' : 'text-blue-700'}>{generationStatus}{generationStatus.includes('complete') && <> <a className="underline" href={`https://docs.google.com/spreadsheets/d/${NEW_MENU_SHEET_ID}/edit?gid=${GEN_BUY_GID}`} target="_blank" rel="noopener noreferrer">GenBUY</a> · <a className="underline" href={`https://docs.google.com/spreadsheets/d/${NEW_MENU_SHEET_ID}/edit?gid=${GEN_SELL_GID}`} target="_blank" rel="noopener noreferrer">GenSELL</a></>}</span>
          : `${selectedRowNumbers.length} row${selectedRowNumbers.length === 1 ? '' : 's'} selected`}
      </div>
      {!accessToken ? <button type="button" onClick={login} className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Sign in to generate</button>
        : <button type="button" onClick={generate} disabled={selectedRowNumbers.length === 0 || generating} className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{generating ? 'Generating...' : 'Generate NewGenBill'}</button>}
    </div>}
  </>;
};

export default NewMenuTable;
