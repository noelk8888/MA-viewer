import { X } from 'lucide-react';
import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, content }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 ring-1 ring-gray-900/5 transform transition-all scale-100 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-center">
                    {content && content.includes('drive.google.com') ? (
                        <div className="w-full">
                            {(() => {
                                const match = content.match(/id=([a-zA-Z0-9_-]+)/);
                                if (match && match[1]) {
                                    return (
                                        <div className="flex flex-col gap-2">
                                            <img
                                                src={`https://drive.google.com/uc?export=view&id=${match[1]}`}
                                                alt="Attachment"
                                                className="w-full h-auto rounded-lg shadow-sm"
                                                referrerPolicy="no-referrer"
                                                crossOrigin="anonymous"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    // Fallback: If image fails (common on iPhone), show a direct button
                                                    const container = e.currentTarget.parentElement;
                                                    if (container && !container.querySelector('a.fallback-link')) {
                                                        const link = document.createElement('a');
                                                        link.href = content; // Original link
                                                        link.target = '_blank';
                                                        link.rel = 'noopener noreferrer';
                                                        link.className = 'fallback-link block w-full py-2 bg-gray-100 text-gray-600 text-center text-xs rounded-lg hover:bg-gray-200 transition-colors mt-2';
                                                        link.innerText = 'Tap to View Image';
                                                        container.appendChild(link);
                                                    }
                                                }}
                                            />
                                        </div>
                                    );
                                }
                                return <p className="text-gray-700 whitespace-pre-wrap font-mono text-sm leading-relaxed break-all">{content}</p>;
                            })()}
                        </div>
                    ) : (
                        <p className="text-gray-700 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                            {content || 'No details available'}
                        </p>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
