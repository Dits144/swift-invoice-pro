import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Printer, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const logoEmojis: Record<string, string> = {
  'default-1': '🏢', 'default-2': '🏬', 'default-3': '🏗️', 'default-4': '🏪',
  'default-5': '🏛️', 'default-6': '📦', 'default-7': '🛒', 'default-8': '💼',
  'default-9': '🔧', 'default-10': '🎨',
};

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

  const downloadPDF = () => {
    if (!invoice || !institution) return;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 14, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(institution.name, 14, 35);
    if (institution.address) doc.text(institution.address, 14, 41);
    if (institution.email) doc.text(institution.email, 14, 47);
    if (institution.phone) doc.text(institution.phone, 14, 53);

    // Invoice details on right
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.invoice_number, 196, 25, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal: ${new Date(invoice.date).toLocaleDateString('id-ID')}`, 196, 32, { align: 'right' });
    if (invoice.due_date) doc.text(`Jatuh Tempo: ${new Date(invoice.due_date).toLocaleDateString('id-ID')}`, 196, 38, { align: 'right' });

    // Client
    doc.setFont('helvetica', 'bold');
    doc.text('Kepada:', 14, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.client_name, 14, 71);
    if (invoice.client_email) doc.text(invoice.client_email, 14, 77);

    // Table
    autoTable(doc, {
      startY: 85,
      head: [['No', 'Deskripsi', 'Qty', 'Harga', 'Total']],
      body: items.map((item) => [
        item.item_no,
        item.description,
        item.quantity,
        `Rp ${Number(item.unit_price).toLocaleString('id-ID')}`,
        `Rp ${Number(item.total).toLocaleString('id-ID')}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 100, 200] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;

    // Totals
    doc.setFontSize(10);
    doc.text(`Subtotal: Rp ${Number(invoice.subtotal).toLocaleString('id-ID')}`, 196, finalY + 15, { align: 'right' });
    if (Number(invoice.balance) > 0) {
      doc.text(`Balance: Rp ${Number(invoice.balance).toLocaleString('id-ID')}`, 196, finalY + 22, { align: 'right' });
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Total: Rp ${Number(invoice.total).toLocaleString('id-ID')}`, 196, finalY + 32, { align: 'right' });

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
      <div ref={invoiceRef} className="mx-auto max-w-3xl rounded-xl border bg-card p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              {institution?.logo_url ? (
                <img src={institution.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                  {logoEmojis[institution?.logo_type || 'default-1'] || '🏢'}
                </div>
              )}
              <h2 className="text-xl font-bold">{institution?.name}</h2>
            </div>
            {institution?.address && <p className="text-sm text-muted-foreground">{institution.address}</p>}
            {institution?.email && <p className="text-sm text-muted-foreground">{institution.email}</p>}
            {institution?.phone && <p className="text-sm text-muted-foreground">{institution.phone}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-extrabold text-primary">INVOICE</h1>
            <p className="mt-1 text-lg font-semibold">{invoice.invoice_number}</p>
            <p className="text-sm text-muted-foreground">Tanggal: {new Date(invoice.date).toLocaleDateString('id-ID')}</p>
            {invoice.due_date && <p className="text-sm text-muted-foreground">Jatuh Tempo: {new Date(invoice.due_date).toLocaleDateString('id-ID')}</p>}
          </div>
        </div>

        {/* Client */}
        <div className="mb-6 rounded-lg bg-muted/50 p-4">
          <p className="text-xs font-medium text-muted-foreground">KEPADA</p>
          <p className="font-semibold">{invoice.client_name}</p>
          {invoice.client_email && <p className="text-sm text-muted-foreground">{invoice.client_email}</p>}
        </div>

        {/* Items table */}
        <table className="mb-6 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-primary/20">
              <th className="py-2 text-left font-semibold">No</th>
              <th className="py-2 text-left font-semibold">Deskripsi</th>
              <th className="py-2 text-right font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Harga</th>
              <th className="py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.item_no}</td>
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">Rp {Number(item.unit_price).toLocaleString('id-ID')}</td>
                <td className="py-2 text-right">Rp {Number(item.total).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto w-64 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Rp {Number(invoice.subtotal).toLocaleString('id-ID')}</span></div>
          {Number(invoice.balance) > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">Balance</span><span>-Rp {Number(invoice.balance).toLocaleString('id-ID')}</span></div>
          )}
          <div className="flex justify-between border-t-2 pt-2 text-lg font-bold">
            <span>Total</span><span>Rp {Number(invoice.total).toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
