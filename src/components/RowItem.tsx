import { FileText, Package } from 'lucide-react';
import React, { useState } from 'react';
import type { SheetRow } from '../services/sheetService';
import Modal from './Modal';
import ImageUploadModal from './ImageUploadModal';
import EditRowModal from './EditRowModal';
import type { ImageType } from '../services/googleSheetsService';

interface RowItemProps {
    row: SheetRow;
    onImageUpdated?: () => void;
    selectedYear: string;
    selectionModeType?: 'DR_CBM' | 'SUPPLIER' | 'ISSUE_DR' | null;
    isSelected?: boolean;
    selectionType?: 'DR' | 'CBM' | 'SUPPLIER' | 'ISSUE_DR' | null;
    selectedCount?: number;
    onToggleSelect?: (rowIndex: number, type: 'DR' | 'CBM' | 'SUPPLIER' | 'ISSUE_DR') => void;
}

const RowItem: React.FC<RowItemProps> = ({ row, onImageUpdated, selectedYear, selectionModeType, isSelected, selectionType, selectedCount = 0, onToggleSelect }) => {
    const [activeModal, setActiveModal] = useState<'DR' | 'CBM' | null>(null);
    const [uploadModalType, setUploadModalType] = useState<ImageType | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [drThumbFailed, setDrThumbFailed] = useState(false);
    const [cbmThumbFailed, setCbmThumbFailed] = useState(false);

    // Logic: Color is red if Remarks (Col Y) is empty
    const isColorAlert = !row.Remarks || row.Remarks.trim() === '';

    return (
        <>
            <div className="grid grid-cols-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                {/* COL 1: Supplier Info */}
                <div className="p-3 flex flex-row items-center gap-2 border-r border-gray-100/50">
                    {(selectionModeType === 'SUPPLIER' || selectionModeType === 'ISSUE_DR') && (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect?.(
                                row.originalIndex,
                                selectionModeType === 'ISSUE_DR' ? 'ISSUE_DR' : 'SUPPLIER'
                            )}
                            disabled={!isSelected && selectedCount >= (selectionModeType === 'ISSUE_DR' ? 1 : 3)}
                            className={`w-5 h-5 rounded border-gray-300 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
                                selectionModeType === 'ISSUE_DR'
                                    ? 'text-red-600 focus:ring-red-500'
                                    : 'text-purple-600 focus:ring-purple-500'
                            }`}
                        />
                    )}
                    <div className="flex flex-col justify-center space-y-1 text-xs sm:text-sm w-full">
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="font-bold text-gray-900 truncate hover:underline cursor-pointer text-left"
                            title={row.Supplier}
                        >
                            {row.Supplier || '-'}
                    </button>
                    <div className="text-gray-500 font-medium font-mono text-[10px] sm:text-xs">
                        {row.Code} ({row.CnyToday})
                    </div>
                    <div className="text-gray-600 line-clamp-2 leading-tight">
                        {row.Description}
                    </div>
                    <div className="flex flex-wrap gap-1 items-center mt-1">
                        {/* COL X - Clickable date to edit */}
                        <button
                            onClick={() => setShowEditModal(true)}
                            className={`font-semibold ${isColorAlert ? 'text-red-500' : 'text-gray-700'} hover:underline cursor-pointer`}
                        >
                            {row.Color || '-'}
                        </button>
                        {/* COL Y */}
                        {row.Remarks && row.Remarks.trim().toUpperCase() !== 'Y' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-md">
                                {row.Remarks}
                            </span>
                        )}
                    </div>
                    </div>
                </div>

                {/* COL 2: DR Icon */}
                <div className="p-2 flex items-center justify-center border-r border-gray-100/50 gap-3">
                    {selectionModeType === 'DR_CBM' && (
                        <input
                            type="checkbox"
                            checked={isSelected && selectionType === 'DR'}
                            onChange={() => onToggleSelect?.(row.originalIndex, 'DR')}
                            disabled={selectionType === 'CBM' || (!isSelected && selectedCount >= 3)}
                            className="w-5 h-5 text-blue-600 rounded-full border-gray-300 focus:ring-blue-500 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    )}
                    <button
                        onClick={() => setActiveModal('DR')}
                        className="relative flex items-center justify-center transition-transform active:scale-95 hover:scale-105"
                        title="View DR details"
                    >
                        {(() => {
                            const match = row.DR && row.DR.match(/id=([a-zA-Z0-9_-]+)/);
                            if (match && match[1] && !drThumbFailed) {
                                return (
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 overflow-hidden rounded-lg shadow-sm bg-gray-100 border border-gray-200">
                                        <img
                                            src={`https://lh3.googleusercontent.com/d/${match[1]}=s200`}
                                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                            referrerPolicy="no-referrer"
                                            loading="lazy"
                                            onError={() => setDrThumbFailed(true)}
                                        />
                                    </div>
                                );
                            }
                            const isEmpty = !row.DR || row.DR.trim() === '';
                            return (
                                <div className={`p-3 rounded-xl transition-colors shadow-sm ${isEmpty ? 'text-gray-300 bg-gray-50' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}>
                                    <FileText size={20} strokeWidth={2} />
                                </div>
                            );
                        })()}
                    </button>
                </div>

                {/* COL 3: Pricing */}
                <div className="p-3 flex flex-col justify-center items-end space-y-1 text-right border-r border-gray-100/50 bg-gray-50/30">
                    <div className="font-bold text-emerald-600 text-sm sm:text-base whitespace-nowrap">
                        <span className="text-xs mr-0.5 opacity-70">¥</span>{row.RMB}
                    </div>
                    <div className="font-medium text-gray-600 text-xs sm:text-sm whitespace-nowrap">
                        <span className="text-[10px] mr-0.5 opacity-70">₱</span>{row.PHP}
                    </div>
                    {row.CBMValue && (
                        <div className="font-bold text-emerald-600 text-sm sm:text-base whitespace-nowrap">
                            <span className="text-xs mr-0.5 opacity-70">¥</span>{row.CBMValue}
                        </div>
                    )}
                    {row.CBMPHP && (
                        <div className="font-medium text-gray-600 text-xs sm:text-sm whitespace-nowrap">
                            <span className="text-[10px] mr-0.5 opacity-70">₱</span>{row.CBMPHP}
                        </div>
                    )}
                    {row.colN?.trim().toUpperCase() === 'Y' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-yellow-600 rounded-md mt-1 inline-block">
                            PAID
                        </span>
                    )}
                </div>

                {/* COL 4: CBM Icon */}
                <div className="p-2 flex items-center justify-center gap-3">
                    {selectionModeType === 'DR_CBM' && (
                        <input
                            type="checkbox"
                            checked={isSelected && selectionType === 'CBM'}
                            onChange={() => onToggleSelect?.(row.originalIndex, 'CBM')}
                            disabled={selectionType === 'DR' || (!isSelected && selectedCount >= 3)}
                            className="w-5 h-5 text-blue-600 rounded-full border-gray-300 focus:ring-blue-500 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    )}
                    <button
                        onClick={() => setActiveModal('CBM')}
                        className="relative flex items-center justify-center transition-transform active:scale-95 hover:scale-105"
                        title="View CBM details"
                    >
                        {(() => {
                            const match = row.CBM && row.CBM.match(/id=([a-zA-Z0-9_-]+)/);
                            if (match && match[1] && !cbmThumbFailed) {
                                return (
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 overflow-hidden rounded-lg shadow-sm bg-gray-100 border border-gray-200">
                                        <img
                                            src={`https://lh3.googleusercontent.com/d/${match[1]}=s200`}
                                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                            referrerPolicy="no-referrer"
                                            loading="lazy"
                                            onError={() => setCbmThumbFailed(true)}
                                        />
                                    </div>
                                );
                            }
                            const isEmpty = !row.CBM || row.CBM.trim() === '';
                            return (
                                <div className={`p-3 rounded-xl transition-colors shadow-sm ${isEmpty ? 'text-gray-300 bg-gray-50' : 'text-purple-600 bg-purple-50 hover:bg-purple-100'}`}>
                                    <Package size={20} strokeWidth={2} />
                                </div>
                            );
                        })()}
                    </button>
                </div>
            </div>

            {/* View Modals */}
            <Modal
                isOpen={activeModal === 'DR'}
                onClose={() => setActiveModal(null)}
                title="Delivery Receipt (DR)"
                content={row.DR}
                onUpload={() => {
                    setUploadModalType('DR');
                    setActiveModal(null);
                }}
            />
            <Modal
                isOpen={activeModal === 'CBM'}
                onClose={() => setActiveModal(null)}
                title="CBM Details"
                content={row.CBM}
                onUpload={() => {
                    setUploadModalType('CBM');
                    setActiveModal(null);
                }}
            />

            {/* Upload Modal */}
            {uploadModalType && (
                <ImageUploadModal
                    isOpen={true}
                    onClose={() => setUploadModalType(null)}
                    imageType={uploadModalType}
                    sheetRowNumber={row.originalIndex}
                    onUploadComplete={() => {
                        onImageUpdated?.();
                        setUploadModalType(null);
                    }}
                    selectedYear={selectedYear}
                />
            )}

            {/* Edit Row Modal */}
            <EditRowModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onRowUpdated={() => onImageUpdated?.()}
                rowNumber={row.originalIndex}
                selectedYear={selectedYear}
            />
        </>
    );
};

export default RowItem;
