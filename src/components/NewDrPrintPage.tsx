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
  interest?: boolean;
}

const InvoiceSheet: React.FC<InvoiceSheetProps> = ({ row, interest = false }) => {
  const quantity = interest ? '' : row.price;
  const cnyRate = Number(row.quantity.replace(/,/g, ''));
  const factor = Number(row.factor.replace(/,/g, '') || 1);
  const unitPrice = interest ? 0 : cnyRate * factor;
  const emptyRows = Array.from({ length: 18 }, (_, index) => index);
  return <section className="dr-sheet">
    <div className="dr-brand">J2N</div>
    <div className="dr-meta">
      <div className="dr-address"><span>Transfer to:</span><span>DMC - Marlon</span><span></span><span>22 Ford Ave., Doña Manuela Subd.,</span><span></span><span>Pamplona Tres, Las Piñas</span></div>
      <div className="dr-reference"><span>Ref #</span><span>{row.reference}</span><span>Date</span><span>{formatDate(row.issueDate)}</span><span>Page:</span><span>1</span></div>
    </div>
    <div className="dr-form">
      <div className="dr-table dr-table-head"><span>Quantity</span><span>Description</span><span>Unit Price</span><span>Subtotal</span></div>
      <div className="dr-table dr-line"><span>{quantity ? Number(quantity.replace(/,/g, '')).toLocaleString('en-US', { maximumFractionDigits: 2 }) : ''}</span><span>{row.description}</span><span>{unitPrice ? unitPrice.toFixed(4) : ''}</span><span>{formatAmount(row.amount)}</span></div>
      <div className="dr-table dr-description-line"><span></span><span>{interest ? 'INTEREST' : 'ITEMS'}</span><span></span><span></span></div>
      {emptyRows.map(index => <div className="dr-table dr-empty" key={index}><span></span><span></span><span></span><span></span></div>)}
      <div className="dr-details">
        <div><b>ITEMS:</b><span>Ref# {row.reference}</span></div>
        {!interest ? <div><b>CBM:</b><span>Ref# {row.reference} (1)</span></div> : null}
        {!interest ? <div className="dr-rate-details"><b>CNY:</b><span>{cnyRate.toFixed(4)}</span><b>factor:</b><span>{factor.toFixed(2)}</span><b>RATE:</b><span>{unitPrice.toFixed(4)}</span></div> : null}
      </div>
    </div>
    <div className="dr-total"><b>TOTAL</b><b>{formatAmount(row.amount)}</b></div>
    <div className="dr-received">RECEIVED IN GOOD CONDITION:</div>
    <div className="dr-signature">Signature Over Printed Name / Date</div>
  </section>;
};

const ImagePage: React.FC<{ row: NewDrRow }> = ({ row }) => <section className="dr-sheet dr-image-page">
  {row.image ? <img src={directImageUrl(row.image)} alt={`DR attachment ${row.reference}`} /> : <div className="dr-no-image">No image is linked in SELL column D for {row.reference}.</div>}
</section>;

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
      .dr-sheet { position:relative; width:210mm; height:297mm; box-sizing:border-box; margin:0 auto 28px; background-color:white; background-image:linear-gradient(#e5e7eb 1px,transparent 1px),linear-gradient(90deg,#e5e7eb 1px,transparent 1px); background-size:100% 21px,64px 100%; color:#111; padding:11mm 7mm; box-shadow:0 15px 45px #0008; overflow:hidden; page-break-after:always; }
      .dr-table { display:grid; grid-template-columns:1.1fr 3.65fr .9fr 1.15fr; }
      .dr-brand { margin:9mm 0 1mm 9mm; font-size:25px; font-weight:800; }
      .dr-meta { display:grid; grid-template-columns:3.2fr 1fr; background:white; }
      .dr-address,.dr-reference { display:grid; grid-template-columns:100px 1fr; min-height:78px; align-items:center; }
      .dr-address { grid-template-columns:96px 1fr; }
      .dr-reference { grid-template-columns:62px 1fr; text-align:right; }
      .dr-reference span { padding:2px 5px; }
      .dr-form { position:relative; margin-top:17mm; height:166mm; background:white; border:1.5px solid #111; }
      .dr-table span { box-sizing:border-box; min-height:22px; padding:2px 5px; border-right:1px solid #111; border-bottom:1px solid #d1d5db; }
      .dr-table-head { font-weight:700; text-align:center; }
      .dr-table-head span { border-bottom:1.5px solid #111; }
      .dr-table span:last-child { border-right:0; }
      .dr-line span:first-child,.dr-line span:nth-child(3),.dr-line span:nth-child(4) { text-align:right; }
      .dr-description-line span:nth-child(2) { font-weight:500; }
      .dr-empty span { min-height:20px; }
      .dr-details { position:absolute; left:33mm; bottom:26mm; line-height:1.55; font-size:16px; }
      .dr-details div { display:grid; grid-template-columns:69px 1fr; }
      .dr-details b { font-weight:400; }
      .dr-rate-details { margin-top:10mm; grid-template-columns:69px 110px !important; }
      .dr-total { position:absolute; left:7mm; right:7mm; bottom:45mm; display:grid; grid-template-columns:5fr 1.15fr; border-top:1.5px solid #111; text-align:right; font-size:17px; padding:7px 4px; background:white; }
      .dr-received { position:absolute; right:8mm; bottom:35mm; font-size:14px; }
      .dr-signature { position:absolute; right:8mm; bottom:18mm; width:72mm; border-bottom:1px solid #111; padding-bottom:4px; text-align:center; font-size:14px; }
      .dr-image-page { display:flex; flex-direction:column; align-items:center; justify-content:center; }
      .dr-image-page img { width:68%; max-height:62%; object-fit:contain; background:white; }
      .dr-no-image { padding:20px; background:white; color:#6b7280; }
      @media print {
        @page { size:A4 portrait; margin:0; }
        body { background:white !important; }
        .dr-preview { padding:0; }
        .dr-toolbar { display:none !important; }
        .dr-sheet { margin:0; box-shadow:none; }
      }
    `}</style>
    <div className="dr-toolbar"><button type="button" onClick={() => window.print()}><Printer size={18} />Print</button><button type="button" onClick={() => window.close()}><X size={18} />Close</button></div>
    <InvoiceSheet row={payload.primary} interest={interest} />
    <ImagePage row={payload.primary} />
  </div>;
};

export default NewDrPrintPage;
