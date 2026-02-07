import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import { uploadImageToDrive } from '../services/googleDriveService';
import { updateSheetCell } from '../services/googleSheetsService';
import type { ImageType } from '../services/googleSheetsService';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageType: ImageType;
  sheetRowNumber: number;
  onUploadComplete: () => void;
}

type UploadState = 'idle' | 'uploading' | 'updating-sheet' | 'success' | 'error';

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  imageType,
  sheetRowNumber,
  onUploadComplete,
}) => {
  const { accessToken, isAuthenticated, login, isLoading: authLoading } = useGoogleAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !accessToken) return;

    const folderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
    const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;

    if (!folderId || !sheetId) {
      setError('Upload configuration missing');
      return;
    }

    try {
      setUploadState('uploading');
      setError(null);

      const uploadResult = await uploadImageToDrive(selectedFile, accessToken, folderId);

      setUploadState('updating-sheet');
      await updateSheetCell(accessToken, sheetId, sheetRowNumber, imageType, uploadResult.driveLink);

      setUploadState('success');
      onUploadComplete();

      setTimeout(() => {
        onClose();
        resetState();
      }, 1500);
    } catch (err) {
      setUploadState('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [selectedFile, accessToken, sheetRowNumber, imageType, onUploadComplete, onClose]);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setUploadState('idle');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    if (uploadState !== 'uploading' && uploadState !== 'updating-sheet') {
      resetState();
      onClose();
    }
  }, [uploadState, resetState, onClose]);

  if (!isOpen) return null;

  const isProcessing = uploadState === 'uploading' || uploadState === 'updating-sheet';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <button
          onClick={handleClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Upload {imageType} Image
        </h3>

        {!isAuthenticated ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Sign in with Google to upload images</p>
            <button
              onClick={login}
              disabled={authLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {authLoading ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </div>
        ) : (
          <>
            <div
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${preview ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isProcessing}
              />

              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg shadow-sm"
                />
              ) : (
                <>
                  <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-600">Click to select an image</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                </>
              )}
            </div>

            {uploadState === 'uploading' && (
              <div className="flex items-center gap-2 mt-4 text-blue-600">
                <Loader2 className="animate-spin" size={18} />
                <span>Uploading to Google Drive...</span>
              </div>
            )}
            {uploadState === 'updating-sheet' && (
              <div className="flex items-center gap-2 mt-4 text-blue-600">
                <Loader2 className="animate-spin" size={18} />
                <span>Updating spreadsheet...</span>
              </div>
            )}
            {uploadState === 'success' && (
              <div className="flex items-center gap-2 mt-4 text-green-600">
                <CheckCircle size={18} />
                <span>Upload complete!</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 mt-4 text-red-600">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isProcessing}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageUploadModal;
