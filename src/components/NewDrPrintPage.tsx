import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { readNewDrPrintPayload, type NewDrRow } from '../services/newDrService';
import { formatAmount, toIsoDate } from '../utils/formatters';

const formatDate = (value: string): string => {
  const iso = toIsoDate(value);
  if (!iso) return value;
  const [year, month, day] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(day).padStart(2, '0')}-${months[month - 1]}-${year}`;
};

const directImageUrl = (value: string): string => {
  const id = value.match(/[?&]id=([^&]+)/)?.[1] || value.match(/\/d\/([^/]+)/)?.[1];
  return id ? `https://drive.google.com/uc?export=view&id=${id}` : value;
};

interface InvoiceSheetProps {
  row: NewDrRow;
  page: number;
  interest?: boolean;
}

const InvoiceSheet: React.FC<InvoiceSheetProps> = ({ row, page, interest = false }) => {
  const unit = interest ? 'PCS' : row.category === 'CBM' ? 'CBM' : 'PCS';
  const quantity = interest ? '' : row.category === 'CBM' ? row.quantity : row.price;
  const unitPrice = interest ? '' : row.category === 'CBM' ? row.price : Number(row.quantity.replace(/,/g, '')) * Number(row.factor.replace(/,/g, '') || 1);
  const rows = Array.from({ length: 29 }, (_, index) => index + 8);
  return <section className="dr-sheet">
    <div className="dr-columns"><span>A</span><span>B</span><span>C</span><span>D</span><span>E</span></div>
    <div className="dr-brand">J2N</div>
    <div className="dr-meta">
      <div className="dr-address"><b>Transfer to:</b><span>DMC - Marlon</span><span></span><span>22 Ford Ave., Doña Manuela Subd.,</span><span></span><span>Pamplona Tres, Las Piñas</span></div>
      <div className="dr-reference"><b>Ref#</b><span>{row.reference}</span><b>Date</b><span>{formatDate(row.issueDate)}</span><b>Page:</b><span>{page}</span></div>
    </div>
    <div className="dr-table dr-table-head"><span>Quantity</span><span>UNIT</span><span>Description</span><span>Unit Price</span><span>Subtotal</span></div>
    <div className="dr-table dr-line"><span>{quantity ? formatAmount(quantity) : ''}</span><span>{unit}</span><span>{row.description}</span><span>{unitPrice ? formatAmount(unitPrice) : ''}</span><span>{formatAmount(row.amount)}</span></div>
    {rows.map(number => <div className="dr-empty" key={number}><span>{number}</span></div>)}
    {!interest && row.category === 'ITEMS' ? <div className="dr-rate"><span>CNY</span><b>{Number(row.quantity.replace(/,/g, '')).toFixed(4)}</b><span>×</span><b>{Number(row.factor.replace(/,/g, '') || 1).toFixed(2)}</b><span>RATE</span><b>{formatAmount(unitPrice)}</b></div> : null}
    <div className="dr-total"><b>TOTAL</b><b>{formatAmount(row.amount)}</b></div>
  </section>;
};

const BackImagePage: React.FC<{ row: NewDrRow; page: number }> = ({ row, page }) => row.image ? <section className="dr-sheet dr-image-page"><div className="dr-image-label">Back Page {page} · {row.reference}</div><img src={directImageUrl(row.image)} alt={`Back Page ${page}`} /></section> : null;

const NewDrPrintPage: React.FC<{ storageKey: string }> = ({ storageKey }) => {
  const payload = readNewDrPrintPayload(storageKey);
  useEffect(() => { document.documentElement.classList.remove('dark'); }, []);
  if (!payload) return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-600">This NEW DR preview is no longer available.</div>;

  const interest = payload.primary.category === 'INTEREST';
  return <div className="dr-preview">
    <style>{`
      body { background:#111827; }
      .dr-preview { min-height:100vh; padding:76px 20px 40px; font-family:Arial,sans-serif; }
      .dr-toolbar { position:fixed; z-index:50; top:0; left:0; right:0; display:flex; justify-content:center; gap:12px; padding:14px; background:#111827eF; }
      .dr-toolbar button { display:flex; align-items:center; gap:8px; border:0; border-radius:9px; padding:10px 18px; font-weight:700; cursor:pointer; }
      .dr-sheet { position:relative; width:210mm; height:297mm; box-sizing:border-box; margin:0 auto 28px; background:white; color:#111; padding:10mm 9mm; box-shadow:0 15px 45px #0008; overflow:hidden; page-break-after:always; }
      .dr-columns,.dr-table { display:grid; grid-template-columns:1.1fr .65fr 3fr 1.2fr 1.4fr; }
      .dr-columns span { text-align:center; border:1px solid #d1d5db; padding:4px; color:#4b5563; }
      .dr-brand { margin:7px 0 3px 11%; color:#0ea5e9; font-size:23px; font-weight:800; }
      .dr-meta { display:grid; grid-template-columns:2.9fr 1.2fr; border-top:1px solid #d1d5db; border-bottom:1px solid #d1d5db; }
      .dr-address,.dr-reference { display:grid; grid-template-columns:100px 1fr; min-height:78px; align-items:center; }
      .dr-reference { border-left:1px solid #d1d5db; grid-template-columns:72px 1fr; text-align:right; }
      .dr-reference b,.dr-reference span { padding:5px 8px; border-bottom:1px solid #e5e7eb; }
      .dr-table span { min-height:28px; padding:7px 8px; border-right:1px solid #d1d5db; border-bottom:1px solid #d1d5db; }
      .dr-table span:first-child { border-left:1px solid #d1d5db; }
      .dr-table-head { font-weight:700; text-align:center; }
      .dr-line span:first-child,.dr-line span:nth-child(4),.dr-line span:nth-child(5) { text-align:right; }
      .dr-line span:nth-child(2) { text-align:center; }
      .dr-empty { height:18px; border-bottom:1px solid #e5e7eb; color:#9ca3af; font-size:9px; }
      .dr-empty span { display:inline-block; width:24px; text-align:right; padding-right:5px; border-right:1px solid #e5e7eb; }
      .dr-rate { display:flex; justify-content:flex-end; gap:13px; padding:9px; border-top:1px solid #9ca3af; }
      .dr-total { position:absolute; left:9mm; right:9mm; bottom:12mm; display:grid; grid-template-columns:4fr 1.4fr; border-top:2px solid #111; border-bottom:2px solid #111; text-align:right; font-size:18px; padding:8px; }
      .dr-image-page { display:flex; flex-direction:column; align-items:center; justify-content:center; }
      .dr-image-page img { max-width:100%; max-height:265mm; object-fit:contain; }
      .dr-image-label { position:absolute; top:6mm; left:9mm; color:#6b7280; font-size:11px; }
      @media print {
        @page { size:A4 portrait; margin:0; }
        body { background:white !important; }
        .dr-preview { padding:0; }
        .dr-toolbar { display:none !important; }
        .dr-sheet { margin:0; box-shadow:none; }
      }
    `}</style>
    <div className="dr-toolbar"><button type="button" onClick={() => window.print()}><Printer size={18} />Print</button><button type="button" onClick={() => window.close()}><X size={18} />Close</button></div>
    <InvoiceSheet row={payload.primary} page={1} interest={interest} />
    <BackImagePage row={payload.primary} page={1} />
    {payload.cbm ? <><InvoiceSheet row={payload.cbm} page={2} /><BackImagePage row={payload.cbm} page={2} /></> : null}
  </div>;
};

export default NewDrPrintPage;
