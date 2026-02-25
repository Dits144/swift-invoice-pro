import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';

interface ItemRow {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function CreateInvoice() {
  const { user, profile, isPremium, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [institutionId, setInstitutionId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ description: '', quantity: 1, unit_price: 0 }]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('institutions').select('*').eq('user_id', user.id)
      .then(({ data }) => {
        setInstitutions(data || []);
        if (data && data.length === 1) setInstitutionId(data[0].id);
      });
  }, [user]);

  // Check quota
  const canCreate = isPremium || (profile?.invoice_quota_used ?? 0) < 3;

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const total = subtotal - balance;

  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleGenerate = async () => {
    if (!user || !canCreate) {
      toast.error('Kuota invoice habis. Upgrade ke Premium!');
      return;
    }
    if (!institutionId) { toast.error('Pilih instansi terlebih dahulu'); return; }
    if (!clientName) { toast.error('Isi nama klien'); return; }
    if (items.some(i => !i.description || i.quantity <= 0 || i.unit_price < 0)) {
      toast.error('Periksa kembali data item');
      return;
    }

    setLoading(true);

    // Get next invoice number
    const { data: invNum } = await supabase.rpc('get_next_invoice_number', { _user_id: user.id });
    const invoiceNumber = invNum || 'INV00001';

    // Insert invoice
    const { data: invoice, error } = await supabase.from('invoices').insert({
      user_id: user.id,
      institution_id: institutionId,
      client_name: clientName,
      client_email: clientEmail || null,
      invoice_number: invoiceNumber,
      date: invoiceDate,
      due_date: dueDate || null,
      subtotal,
      balance,
      total,
    }).select().single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Insert items
    const itemsPayload = items.map((item, i) => ({
      invoice_id: invoice.id,
      item_no: i + 1,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }));

    await supabase.from('invoice_items').insert(itemsPayload);

    // Increment quota
    await supabase.from('profiles').update({
      invoice_quota_used: (profile?.invoice_quota_used ?? 0) + 1
    }).eq('id', user.id);

    await refreshProfile();
    setLoading(false);
    toast.success('Invoice berhasil dibuat!');
    navigate(`/invoices/${invoice.id}`);
  };

  if (!canCreate) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <h2 className="mb-2 text-xl font-bold">Kuota Invoice Habis</h2>
          <p className="mb-6 text-muted-foreground">Anda sudah menggunakan 3/3 kuota free invoice.</p>
          <Button onClick={() => navigate('/upgrade')}>Upgrade ke Premium</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Buat Invoice</h1>
        {/* Step indicator */}
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-6">
        {/* Step 1: Institution */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pilih Instansi</h2>
            {institutions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>Belum ada instansi. <button onClick={() => navigate('/institutions')} className="text-primary hover:underline">Tambah dulu</button></p>
              </div>
            ) : (
              <Select value={institutionId} onValueChange={setInstitutionId}>
                <SelectTrigger><SelectValue placeholder="Pilih instansi" /></SelectTrigger>
                <SelectContent>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!institutionId} className="gap-2">Lanjut <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 2: Client Info */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Data Klien & Invoice</h2>
            <div>
              <Label>Nama Klien *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>
            <div>
              <Label>Email Klien</Label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Invoice</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <Label>Jatuh Tempo</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Kembali</Button>
              <Button onClick={() => setStep(3)} disabled={!clientName} className="gap-2">Lanjut <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 3: Items */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Item Invoice</h2>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-lg border p-3">
                  <div className="col-span-12 sm:col-span-5">
                    <Label className="text-xs">Deskripsi</Label>
                    <Input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Nama item" />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <Label className="text-xs">Harga</Label>
                    <Input type="number" min={0} value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))} />
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-medium">{(item.quantity * item.unit_price).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={addItem} className="gap-2"><Plus className="h-4 w-4" /> Tambah Item</Button>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Kembali</Button>
              <Button onClick={() => setStep(4)} className="gap-2">Lanjut <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Ringkasan</h2>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span></div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Balance (potongan)</span>
                <Input type="number" min={0} value={balance} onChange={(e) => setBalance(Number(e.target.value))} className="w-40 text-right" />
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Total</span><span>Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Kembali</Button>
              <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                {loading ? 'Membuat...' : 'Generate Invoice'}
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
