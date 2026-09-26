import React, { useEffect, useState } from 'react';
import { AlertCircle, Edit3, Loader2, Plus, X } from 'lucide-react';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import { appendNewMenuRow, updateNewMenuRow, type NewMenuInput, type NewMenuRow } from '../services/newMenuService';
import { toIsoDate } from '../utils/formatters';

const initialValues: NewMenuInput = {
  reference: '',
  date: '',
  cnyRate: '',
  marketRate: '',
  supplier: '',
  itemLink: '',
  cnyAmount: '',
  cbmLink: '',
  volume: '',
  cbmA: '9500',
  cbmB: '10500',
  share: '',
};

const fields: Array<{ key: keyof NewMenuInput; label: string; type?: string; inputMode?: 'decimal' | 'url'; placeholder?: string }> = [
  { key: 'reference', label: 'REF' },
  { key: 'date', label: 'DATE', type: 'date' },
  { key: 'cnyRate', label: 'CNY', inputMode: 'decimal', placeholder: '0.0000' },
  { key: 'marketRate', label: 'MRATE', inputMode: 'decimal', placeholder: '0.0000' },
  { key: 'supplier', label: 'SUPPLIER' },
  { key: 'itemLink', label: 'ITEM LINK', type: 'url', inputMode: 'url' },
  { key: 'cnyAmount', label: 'CNY AMT', inputMode: 'decimal' },
  { key: 'cbmLink', label: 'CBM LINK', type: 'url', inputMode: 'url' },
  { key: 'volume', label: 'VOL', inputMode: 'decimal', placeholder: '0.0000' },
  { key: 'cbmA', label: 'CBM A', inputMode: 'decimal' },
  { key: 'cbmB', label: 'CBM B', inputMode: 'decimal' },
  { key: 'share', label: 'SHARE (%)', inputMode: 'decimal', placeholder: '50' },
];

const valuesForRow = (row: NewMenuRow | null): NewMenuInput => row ? {
  reference: row.reference,
  date: toIsoDate(row.date),
  cnyRate: row.cnyRate,
  marketRate: row.sellRate,
  supplier: row.supplier,
  itemLink: row.firstImage,
  cnyAmount: row.amountCny,
  cbmLink: row.secondImage,
  volume: row.cbm,
  cbmA: row.cbmFactor,
  cbmB: row.cbmSellPrice,
  share: row.sharePercent.replace(/%/g, ''),
} : initialValues;

const AddNewMenuModal: React.FC<{ isOpen: boolean; editingRow?: NewMenuRow | null; onClose: () => void; onSaved: (rowNumber: number) => void }> = ({ isOpen, editingRow = null, onClose, onSaved }) => {
  const { accessToken, login, logout } = useGoogleAuth();
  const [values, setValues] = useState<NewMenuInput>(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValues(valuesForRow(editingRow));
    setError(null);
  }, [editingRow, isOpen]);

  if (!isOpen) return null;

  const close = () => {
    if (saving) return;
    setValues(initialValues);
    setError(null);
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessToken || saving) return;
    if (!window.confirm(`Are you done? Confirm to ${editingRow ? 'update' : 'add'} this listing.`)) return;
    setSaving(true);
    setError(null);
    try {
      const rowNumber = editingRow?.sheetRowNumber || await appendNewMenuRow(accessToken, values);
      if (editingRow) await updateNewMenuRow(accessToken, editingRow.sheetRowNumber, values);
      setValues(initialValues);
      onSaved(rowNumber);
      onClose();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : `Could not ${editingRow ? 'update' : 'add'} the NEW 2026 row.`;
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <button type="button" onClick={close} disabled={saving} className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40" aria-label="Close form"><X size={20} /></button>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-white ${editingRow ? 'bg-blue-600' : 'bg-emerald-600'}`}>{editingRow ? <Edit3 size={16} /> : <Plus size={18} />}</span>{editingRow ? 'Edit NEW 2026 listing' : 'Add to NEW 2026'}</h2>
      <p className="mt-1 text-xs text-gray-500">All fields are optional.{editingRow ? ' Changes will update this existing row.' : ' One blank row will be left before this entry.'}</p>
      {!accessToken ? <div className="py-10 text-center"><p className="mb-4 text-sm text-gray-600">Sign in with Google to {editingRow ? 'edit' : 'add'} an entry.</p><button type="button" onClick={login} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white">Sign in with Google</button></div>
        : <form onSubmit={submit} className="mt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map(field => <label key={field.key} className={`${field.key === 'supplier' || field.key === 'itemLink' || field.key === 'cbmLink' ? 'sm:col-span-2' : ''} text-xs font-semibold text-gray-600`}>
              {field.label}
              <input
                type={field.type || 'text'}
                inputMode={field.inputMode}
                value={values[field.key]}
                onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))}
                placeholder={field.placeholder}
                disabled={saving}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
              />
            </label>)}
          </div>
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><div className="flex gap-2"><AlertCircle size={18} className="shrink-0" /><span>{error}</span></div>{error.includes('expired') && <button type="button" onClick={() => { logout(); login(); }} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-white">Sign in again</button>}</div>}
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={close} disabled={saving} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">Cancel</button>
            <button type="submit" disabled={saving} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${editingRow ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{saving ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Saving...</span> : editingRow ? 'Save changes' : 'Add entry'}</button>
          </div>
        </form>}
    </div>
  </div>;
};

export default AddNewMenuModal;
