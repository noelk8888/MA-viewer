import React, { useState, useCallback } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import { appendSheetRow } from '../services/googleSheetsService';
import type { NewRowData } from '../services/googleSheetsService';

interface AddRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRowAdded: () => void;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const AddRowModal: React.FC<AddRowModalProps> = ({
  isOpen,
  onClose,
  onRowAdded,
}) => {
  const { accessToken, isAuthenticated, login, logout, isLoading: authLoading, isConfigured } = useGoogleAuth();
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [date, setDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [amountCNY, setAmountCNY] = useState('');
  const [sacks, setSacks] = useState('');
  const [cnyToday, setCnyToday] = useState('');
  const [cnyMA, setCnyMA] = useState('');
  const [cbm, setCbm] = useState('');
  const [drNumber, setDrNumber] = useState('');

  const resetForm = useCallback(() => {
    setDate('');
    setSupplier('');
    setAmountCNY('');
    setSacks('');
    setCnyToday('');
    setCnyMA('');
    setCbm('');
    setDrNumber('');
    setSubmitState('idle');
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!accessToken) return;

    const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
    if (!sheetId) {
      setError('Sheet ID not configured');
      return;
    }

    try {
      setSubmitState('submitting');
      setError(null);

      const rowData: NewRowData = {
        date: date || undefined,
        supplier: supplier || undefined,
        amountCNY: amountCNY ? parseFloat(amountCNY) : undefined,
        sacks: sacks ? parseFloat(sacks) : undefined,
        cnyToday: cnyToday ? parseFloat(cnyToday) : undefined,
        cnyMA: cnyMA ? parseFloat(cnyMA) : undefined,
        cbm: cbm ? parseFloat(cbm) : undefined,
        drNumber: drNumber || undefined,
      };

      await appendSheetRow(accessToken, sheetId, rowData);

      setSubmitState('success');
      onRowAdded();

      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    } catch (err) {
      setSubmitState('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to add row';

      // Check if it's an authentication error
      if (errorMessage.includes('authentication') || errorMessage.includes('credentials') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('OAuth')) {
        setError('Session expired. Please log in again.');
      } else {
        setError(errorMessage);
      }
    }
  }, [accessToken, date, supplier, amountCNY, sacks, cnyToday, cnyMA, cbm, drNumber, onRowAdded, onClose, resetForm]);

  const handleClose = useCallback(() => {
    if (submitState !== 'submitting') {
      resetForm();
      onClose();
    }
  }, [submitState, resetForm, onClose]);

  if (!isOpen) return null;

  const isProcessing = submitState === 'submitting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus size={20} className="text-green-600" />
          Add New Entry
        </h3>

        {!isConfigured ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
            <p className="text-gray-900 font-medium">Configuration Missing</p>
            <p className="text-gray-600 text-sm mt-1">
              Google Client ID is not configured.
            </p>
          </div>
        ) : !isAuthenticated ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Sign in with Google to add entries</p>
            <button
              onClick={login}
              disabled={authLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {authLoading ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Row 1: Date & Supplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date (B)</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Supplier (C)</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    disabled={isProcessing}
                    placeholder="Enter supplier"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Row 2: Amount CNY & Sacks */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount CNY (E)</label>
                  <input
                    type="number"
                    value={amountCNY}
                    onChange={(e) => setAmountCNY(e.target.value)}
                    disabled={isProcessing}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sacks (F)</label>
                  <input
                    type="number"
                    value={sacks}
                    onChange={(e) => setSacks(e.target.value)}
                    disabled={isProcessing}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Row 3: CNY Today & CNY MA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CNY Today (J)</label>
                  <input
                    type="number"
                    value={cnyToday}
                    onChange={(e) => setCnyToday(e.target.value)}
                    disabled={isProcessing}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CNY MA (O)</label>
                  <input
                    type="number"
                    value={cnyMA}
                    onChange={(e) => setCnyMA(e.target.value)}
                    disabled={isProcessing}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Row 4: CBM & DR Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CBM (S)</label>
                  <input
                    type="number"
                    value={cbm}
                    onChange={(e) => setCbm(e.target.value)}
                    disabled={isProcessing}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">DR Number (Y)</label>
                  <input
                    type="text"
                    value={drNumber}
                    onChange={(e) => setDrNumber(e.target.value)}
                    disabled={isProcessing}
                    placeholder="Enter DR#"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {submitState === 'submitting' && (
              <div className="flex items-center gap-2 mt-4 text-green-600">
                <Loader2 className="animate-spin" size={18} />
                <span>Adding entry to sheet...</span>
              </div>
            )}
            {submitState === 'success' && (
              <div className="flex items-center gap-2 mt-4 text-green-600">
                <CheckCircle size={18} />
                <span>Entry added successfully!</span>
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2 text-red-600">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
                {error.includes('Session expired') && (
                  <button
                    onClick={() => {
                      logout();
                      login();
                    }}
                    className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Login Again
                  </button>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Entry
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddRowModal;
