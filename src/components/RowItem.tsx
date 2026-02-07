import { FileText, Package, Camera } from 'lucide-react';
import React, { useState } from 'react';
import type { SheetRow } from '../services/sheetService';
import Modal from './Modal';
import ImageUploadModal from './ImageUploadModal';
import type { ImageType } from '../services/googleSheetsService';

interface RowItemProps {
    row: SheetRow;
    onImageUpdated?: () => void;
}

const RowItem: React.FC<RowItemProps> = ({ row, onImageUpdated }) => {
    const [activeModal, setActiveModal] = useState<'DR' | 'CBM' | null>(null);
    const [uploadModalType, setUploadModalType] = useState<ImageType | null>(null);
    const [drThumbFailed, setDrThumbFailed] = useState(false);
    const [cbmThumbFailed, setCbmThumbFailed] = useState(false);

    // Logic: Color is red if Remarks (Col Y) is empty
    const isColorAlert = !row.Remarks || row.Remarks.trim() === '';

    return (
        <>
            <div className="grid grid-cols-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                {/* COL 1: Supplier Info */}
                <div className="p-3 flex flex-col justify-center space-y-1 text-xs sm:text-sm border-r border-gray-100/50">
                    <div className="font-bold text-gray-900 truncate" title={row.Supplier}>
                        {row.Supplier || '-'}
                    </div>
                    <div className="text-gray-500 font-medium font-mono text-[10px] sm:text-xs">
                        {row.Code}
                    </div>
                    <div className="text-gray-600 line-clamp-2 leading-tight">
                        {row.Description}
                    </div>
                    <div className="flex flex-wrap gap-1 items-center mt-1">
                        {/* COL X */}
                        <span
                            className={`font-semibold ${isColorAlert ? 'text-red-500' : 'text-gray-700'}`}
                        >
                            {row.Color || '-'}
                        </span>
                        {/* COL Y */}
                        {row.Remarks && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-md">
                                {row.Remarks}
                            </span>
                        )}
                    </div>
                </div>

                {/* COL 2: DR Icon */}
                <div className="p-2 flex items-center justify-center border-r border-gray-100/50">
                    <div className="group/dr relative overflow-visible">
                        <button
                            onClick={() => setActiveModal('DR')}
                            className="relative flex items-center justify-center transition-transform active:scale-95"
                        >
                            {(() => {
                                const match = row.DR && row.DR.match(/id=([a-zA-Z0-9_-]+)/);
                                if (match && match[1] && !drThumbFailed) {
                                    return (
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 overflow-hidden rounded-lg shadow-sm bg-gray-100 border border-gray-200">
                                            <img
                                                src={`https://lh3.googleusercontent.com/d/${match[1]}=s200`}
                                                className="w-full h-full object-cover group-hover/dr:opacity-90 transition-opacity"
                                                referrerPolicy="no-referrer"
                                                loading="lazy"
                                                onError={() => setDrThumbFailed(true)}
                                            />
                                        </div>
                                    );
                                }
                                const isEmpty = !row.DR || row.DR.trim() === '';
                                return (
                                    <div className={`p-3 rounded-xl transition-colors shadow-sm ${isEmpty ? 'text-gray-300 bg-gray-50' : 'text-blue-600 bg-blue-50 group-hover/dr:bg-blue-100'}`}>
                                        <FileText size={20} strokeWidth={2} />
                                    </div>
                                );
                            })()}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setUploadModalType('DR');
                            }}
                            className="absolute -bottom-0.5 -right-0.5 p-1.5 bg-blue-600 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover/dr:opacity-100 transition-opacity shadow-md hover:bg-blue-700 z-10"
                            title="Upload new DR image"
                        >
                            <Camera size={12} />
                        </button>
                    </div>
                </div>

                {/* COL 3: Pricing */}
                <div className="p-3 flex flex-col justify-center items-end space-y-1 text-right border-r border-gray-100/50 bg-gray-50/30">
                    <div className="font-bold text-emerald-600 text-sm sm:text-base whitespace-nowrap">
                        <span className="text-xs mr-0.5 opacity-70">¥</span>{row.RMB}
                    </div>
                    <div className="font-medium text-gray-600 text-xs sm:text-sm whitespace-nowrap">
                        <span className="text-[10px] mr-0.5 opacity-70">₱</span>{row.PHP}
                    </div>
                </div>

                {/* COL 4: CBM Icon */}
                <div className="p-2 flex items-center justify-center">
                    <div className="group/cbm relative overflow-visible">
                        <button
                            onClick={() => setActiveModal('CBM')}
                            className="relative flex items-center justify-center transition-transform active:scale-95"
                        >
                            {(() => {
                                const match = row.CBM && row.CBM.match(/id=([a-zA-Z0-9_-]+)/);
                                if (match && match[1] && !cbmThumbFailed) {
                                    return (
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 overflow-hidden rounded-lg shadow-sm bg-gray-100 border border-gray-200">
                                            <img
                                                src={`https://lh3.googleusercontent.com/d/${match[1]}=s200`}
                                                className="w-full h-full object-cover group-hover/cbm:opacity-90 transition-opacity"
                                                referrerPolicy="no-referrer"
                                                loading="lazy"
                                                onError={() => setCbmThumbFailed(true)}
                                            />
                                        </div>
                                    );
                                }
                                const isEmpty = !row.CBM || row.CBM.trim() === '';
                                return (
                                    <div className={`p-3 rounded-xl transition-colors shadow-sm ${isEmpty ? 'text-gray-300 bg-gray-50' : 'text-purple-600 bg-purple-50 group-hover/cbm:bg-purple-100'}`}>
                                        <Package size={20} strokeWidth={2} />
                                    </div>
                                );
                            })()}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setUploadModalType('CBM');
                            }}
                            className="absolute -bottom-0.5 -right-0.5 p-1.5 bg-purple-600 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover/cbm:opacity-100 transition-opacity shadow-md hover:bg-purple-700 z-10"
                            title="Upload new CBM image"
                        >
                            <Camera size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* View Modals */}
            <Modal
                isOpen={activeModal === 'DR'}
                onClose={() => setActiveModal(null)}
                title="Delivery Receipt (DR)"
                content={row.DR}
            />
            <Modal
                isOpen={activeModal === 'CBM'}
                onClose={() => setActiveModal(null)}
                title="CBM Details"
                content={row.CBM}
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
                />
            )}
        </>
    );
};

export default RowItem;
