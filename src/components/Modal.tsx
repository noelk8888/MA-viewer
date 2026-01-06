```typescript
import { X } from 'lucide-react';
import React, { useState } from 'react';

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
                                            {/* Stateful Image Loader */}
                                            {(() => {
                                                const [imgSrc, setImgSrc] = useState(`https://lh3.googleusercontent.com/d/${match[1]}=s3000`);
const [attempts, setAttempts] = useState(0);

const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Strategy: lh3 -> uc?export=view -> thumbnail
    if (attempts === 0) {
        // Fallback 1: Standard Export
        setImgSrc(`https://drive.google.com/uc?export=view&id=${match[1]}`);
        setAttempts(1);
    } else if (attempts === 1) {
        // Fallback 2: Thumbnail API (Lower res but reliable)
        setImgSrc(`https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`);
        setAttempts(2);
    } else {
        // Final Fallback: Hide strictly if requested, but a broken icon is better than whitespace
        // User said "no need to show this" referring to the button.
        // We'll leave it hidden or show a small broken image icon.
        e.currentTarget.style.display = 'none';
    }
};

return (
    <img
        src={imgSrc}
        alt="Attachment"
        className="w-full h-auto rounded-lg shadow-sm"
        referrerPolicy="no-referrer"
        onError={handleError}
    />
);
                                            }) ()}
                                        </div >
                                    );
                                }
return <p className="text-gray-700 whitespace-pre-wrap font-mono text-sm leading-relaxed break-all">{content}</p>;
                            }) ()}
                        </div >
                    ) : (
    <p className="text-gray-700 whitespace-pre-wrap font-mono text-sm leading-relaxed">
        {content || 'No details available'}
    </p>
)}
                </div >

    <div className="mt-6 flex justify-end">
        <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 active:scale-95"
        >
            Close
        </button>
    </div>
            </div >
        </div >
    );
};

export default Modal;
