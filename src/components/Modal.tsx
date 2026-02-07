import { X, Upload, Check, Share2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    onUpload?: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, content, onUpload }) => {
    const [copySuccess, setCopySuccess] = useState(false);

    // Extract Google Drive ID if present
    const driveMatch = content?.match(/id=([a-zA-Z0-9_-]+)/);
    const driveId = driveMatch?.[1];
    const hasImage = !!driveId;

    // Image loading states - MUST be at top level (before any early returns)
    const [imgSrc, setImgSrc] = useState(`https://lh3.googleusercontent.com/d/${driveId}=s3000`);
    const [attempts, setAttempts] = useState(0);
    const [failed, setFailed] = useState(false);

    // Reset image states when driveId changes
    useEffect(() => {
        if (driveId) {
            setImgSrc(`https://lh3.googleusercontent.com/d/${driveId}=s3000`);
            setAttempts(0);
            setFailed(false);
        }
    }, [driveId]);

    // Early return AFTER all hooks
    if (!isOpen) return null;

    const handleImageError = () => {
        // Strategy: lh3 -> uc?export=view -> thumbnail -> Fallback Button
        if (attempts === 0) {
            setImgSrc(`https://drive.google.com/uc?export=view&id=${driveId}`);
            setAttempts(1);
        } else if (attempts === 1) {
            setImgSrc(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`);
            setAttempts(2);
        } else {
            setFailed(true);
        }
    };

    const handleShareImage = async () => {
        if (!driveId) return;

        try {
            // Fetch the image as a blob
            const response = await fetch(`https://lh3.googleusercontent.com/d/${driveId}=s3000`, {
                mode: 'cors',
                referrerPolicy: 'no-referrer'
            });
            const blob = await response.blob();

            // Try native share API (works great on mobile)
            if (navigator.share && navigator.canShare) {
                const file = new File([blob], 'image.jpg', { type: blob.type });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file]
                    });
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                    return;
                }
            }

            // Fallback: Try clipboard copy (works on desktop)
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        [blob.type]: blob
                    })
                ]);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            } catch {
                // Final fallback: Open in new tab
                const imageUrl = `https://drive.google.com/uc?export=view&id=${driveId}`;
                window.open(imageUrl, '_blank');
                alert('Image opened in new tab! Long-press to save or share.');
            }
        } catch (err) {
            console.error('Share failed:', err);
            alert('Failed to share image. Please try again.');
        }
    };

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
                    {driveId ? (
                        <div className="w-full">
                            {failed ? (
                                <a
                                    href={`https://drive.google.com/open?id=${driveId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full py-4 bg-gray-200 text-gray-700 text-center font-medium rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Click to load image
                                </a>
                            ) : (
                                <img
                                    src={imgSrc}
                                    alt="Attachment"
                                    className="w-full h-auto rounded-lg shadow-sm"
                                    referrerPolicy="no-referrer"
                                    onError={handleImageError}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-400 text-sm">No image uploaded</p>
                        </div>
                    )}
                </div>

                {/* 3-Button Action Row */}
                <div className="mt-6 flex gap-2">
                    {/* UPLOAD or REPLACE */}
                    {onUpload && (
                        <button
                            onClick={onUpload}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                            <Upload size={16} />
                            {hasImage ? 'Replace' : 'Upload'}
                        </button>
                    )}

                    {/* SHARE/COPY */}
                    <button
                        onClick={handleShareImage}
                        disabled={!hasImage}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        {copySuccess ? (
                            <>
                                <Check size={16} />
                                Done!
                            </>
                        ) : (
                            <>
                                <Share2 size={16} />
                                Share
                            </>
                        )}
                    </button>

                    {/* CLOSE */}
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
