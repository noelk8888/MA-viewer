import { FileText, Package } from 'lucide-react';
import React, { useState } from 'react';
import type { SheetRow } from '../services/sheetService';
import Modal from './Modal';

interface RowItemProps {
    row: SheetRow;
}

const RowItem: React.FC<RowItemProps> = ({ row }) => {
    const [activeModal, setActiveModal] = useState<'DR' | 'CBM' | null>(null);

    // Logic: Color is red if Remarks (Col Y) is empty
    const isColorAlert = !row.Remarks || row.Remarks.trim() === '';

    // Also logic: the user said "COL X (color red if COL Y is empty)"
    // So we display COL X (row.Color) in red if row.Remarks is empty.

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
                    <button
                        onClick={() => setActiveModal('DR')}
                        className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all shadow-sm active:scale-95"
                    >
                        <FileText size={20} strokeWidth={2} />
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
                </div>

                {/* COL 4: CBM Icon */}
                <div className="p-2 flex items-center justify-center">
                    <button
                        onClick={() => setActiveModal('CBM')}
                        className="p-3 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all shadow-sm active:scale-95"
                    >
                        <Package size={20} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* Modals */}
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
        </>
    );
};

export default RowItem;
