import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Printer, ArrowLeft, Lock, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InvoiceDetail() {
  const { id } = useParams();
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [institution, setInstitution] = useState<any>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).eq('user_id', user.id).single();
      if (!inv) { navigate('/invoices'); return; }
      setInvoice(inv);

      const { data: itms } = await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('item_no');
      setItems(itms || []);

      const { data: inst } = await supabase.from('institutions').select('*').eq('id', inv.institution_id).single();
      setInstitution(inst);
    })();
  }, [id, user]);

  const loadImageAsBase64 = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const downloadPDF = async () => {
    if (!invoice || !institution) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const marginL = 20;
    const marginR = 20;
    const contentW = pageW - marginL - marginR;

    // Try to add logo — maintain aspect ratio
    if (institution.logo_url) {
      try {
        const base64 = await loadImageAsBase64(institution.logo_url);
        if (base64) {
          const img = new Image();
          img.src = base64;
          const maxLogoH = 22;
          const maxLogoW = 45;
          const ratio = img.naturalWidth / img.naturalHeight;
          let logoW = maxLogoW;
          let logoH = logoW / ratio;
          if (logoH > maxLogoH) { logoH = maxLogoH; logoW = logoH * ratio; }
          doc.addImage(base64, 'PNG', pageW - marginR - logoW, 15, logoW, logoH, undefined, 'FAST');
        }
      } catch (e) { /* continue without logo */ }
    }

    // Header left
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 100, 200);
    doc.text('INVOICE', marginL, 28);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(institution.name, marginL, 38);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    let instY = 44;
    if (institution.address) { doc.text(institution.address, marginL, instY); instY += 5; }
    if (institution.email) { doc.text(institution.email, marginL, instY); instY += 5; }
    if (institution.phone) { doc.text(institution.phone, marginL, instY); instY += 5; }

    // Invoice meta on right
    const rightX = pageW - marginR;
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(invoice.invoice_number, rightX, 42, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Tanggal: ${new Date(invoice.date).toLocaleDateString('id-ID')}`, rightX, 48, { align: 'right' });
    if (invoice.due_date) doc.text(`Jatuh Tempo: ${new Date(invoice.due_date).toLocaleDateString('id-ID')}`, rightX, 53, { align: 'right' });

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(marginL, 62, rightX, 62);

    // Client
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('KEPADA', marginL, 70);
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.client_name, marginL, 76);
    if (invoice.client_email) { doc.setFontSize(9); doc.setTextColor(120, 120, 120); doc.text(invoice.client_email, marginL, 81); }

    // Table
    autoTable(doc, {
      startY: 90,
      margin: { left: marginL, right: marginR },
      head: [['No', 'Deskripsi', 'Qty', 'Harga', 'Total']],
      body: items.map((item) => [
        item.item_no,
        item.description,
        item.quantity,
        `Rp ${Number(item.unit_price).toLocaleString('id-ID')}`,
        `Rp ${Number(item.total).toLocaleString('id-ID')}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 100, 200], fontSize: 9, cellPadding: 4 },
      bodyStyles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 15 },
        2: { halign: 'right', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 35 },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;

    // Totals — right aligned box
    const totalsX = rightX - 70;
    let tY = finalY + 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Subtotal', totalsX, tY);
    doc.setTextColor(40, 40, 40);
    doc.text(`Rp ${Number(invoice.subtotal).toLocaleString('id-ID')}`, rightX, tY, { align: 'right' });
    if (Number(invoice.balance) > 0) {
      tY += 7;
      doc.setTextColor(120, 120, 120);
      doc.text('Balance', totalsX, tY);
      doc.setTextColor(40, 40, 40);
      doc.text(`-Rp ${Number(invoice.balance).toLocaleString('id-ID')}`, rightX, tY, { align: 'right' });
    }
    tY += 3;
    doc.setDrawColor(30, 100, 200);
    doc.setLineWidth(0.8);
    doc.line(totalsX, tY, rightX, tY);
    tY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 100, 200);
    doc.text('Total', totalsX, tY);
    doc.setTextColor(40, 40, 40);
    doc.text(`Rp ${Number(invoice.total).toLocaleString('id-ID')}`, rightX, tY, { align: 'right' });

    doc.save(`${invoice.invoice_number}.pdf`);
  };

  const handlePrint = () => {
    downloadPDF();
  };

  if (!invoice) {
    return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">Memuat...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/invoices')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
        <div className="flex-1" />
        <Button onClick={downloadPDF} className="gap-2"><Download className="h-4 w-4" /> Download PDF</Button>
        <Button variant="outline" onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
        <Button variant="outline" disabled={!isPremium} className="gap-2" title={!isPremium ? 'Fitur Premium' : ''}>
          {!isPremium && <Lock className="h-3 w-3" />} Export Word
        </Button>
        <Button variant="outline" disabled={!isPremium} className="gap-2" title={!isPremium ? 'Fitur Premium' : ''}>
          {!isPremium && <Lock className="h-3 w-3" />} Export Excel
        </Button>
      </div>

      {/* Invoice Preview */}
      <div ref={invoiceRef} className="mx-auto max-w-[800px] rounded-xl bg-white p-10 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-8">
          {/* Left: Invoice title + institution info */}
          <div className="space-y-1">
            <h1 className="text-[28px] font-extrabold tracking-tight text-primary leading-none">INVOICE</h1>
            <p className="mt-3 text-base font-semibold text-foreground">{institution?.name}</p>
            {institution?.address && <p className="text-sm text-muted-foreground">{institution.address}</p>}
            {institution?.email && <p className="text-sm text-muted-foreground">{institution.email}</p>}
            {institution?.phone && <p className="text-sm text-muted-foreground">{institution.phone}</p>}
          </div>
          {/* Right: Logo + invoice meta */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            {institution?.logo_url ? (
              <img src={institution.logo_url} alt={institution.name} className="h-[60px] w-auto object-contain max-w-[120px]" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
            )}
            <div className="text-right space-y-0.5">
              <p className="text-sm font-bold text-foreground">{invoice.invoice_number}</p>
              <p className="text-xs text-muted-foreground">Tanggal: {new Date(invoice.date).toLocaleDateString('id-ID')}</p>
              {invoice.due_date && <p className="text-xs text-muted-foreground">Jatuh Tempo: {new Date(invoice.due_date).toLocaleDateString('id-ID')}</p>}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-7 h-px bg-border" />

        {/* Client */}
        <div className="mb-8 rounded-lg bg-muted/40 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Kepada</p>
          <p className="text-base font-semibold text-foreground">{invoice.client_name}</p>
          {invoice.client_email && <p className="text-sm text-muted-foreground">{invoice.client_email}</p>}
        </div>

        {/* Items table */}
        <table className="mb-8 w-full text-sm">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="rounded-tl-lg py-3 pl-4 text-left font-semibold text-xs uppercase tracking-wide w-12">No</th>
              <th className="py-3 text-left font-semibold text-xs uppercase tracking-wide">Deskripsi</th>
              <th className="py-3 pr-4 text-right font-semibold text-xs uppercase tracking-wide w-16">Qty</th>
              <th className="py-3 pr-4 text-right font-semibold text-xs uppercase tracking-wide w-28">Harga</th>
              <th className="rounded-tr-lg py-3 pr-4 text-right font-semibold text-xs uppercase tracking-wide w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 1 ? 'bg-muted/30' : ''}>
                <td className="py-3 pl-4 text-muted-foreground">{item.item_no}</td>
                <td className="py-3">{item.description}</td>
                <td className="py-3 pr-4 text-right">{item.quantity}</td>
                <td className="py-3 pr-4 text-right">Rp {Number(item.unit_price).toLocaleString('id-ID')}</td>
                <td className="py-3 pr-4 text-right font-medium">Rp {Number(item.total).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-[280px] space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Rp {Number(invoice.subtotal).toLocaleString('id-ID')}</span></div>
            {Number(invoice.balance) > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Balance</span><span>-Rp {Number(invoice.balance).toLocaleString('id-ID')}</span></div>
            )}
            <div className="border-t-2 border-primary/30 pt-3 mt-2" />
            <div className="flex justify-between text-lg font-bold">
              <span className="text-primary">Total</span><span>Rp {Number(invoice.total).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
