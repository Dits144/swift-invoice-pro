import { useState, useEffect } from 'react';
import { Check, Upload, Crown, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';

export default function Upgrade() {
  const { user, isPremium, profile } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState('15000');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPayments = async () => {
    if (!user) return;
    const { data } = await supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPayments(data || []);
  };

  useEffect(() => { fetchPayments(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !proofFile || !payerName) return;
    setLoading(true);

    const path = `${user.id}/${Date.now()}-${proofFile.name}`;
    const { error: uploadErr } = await supabase.storage.from('payment_proofs').upload(path, proofFile);
    if (uploadErr) { toast.error('Gagal upload bukti'); setLoading(false); return; }

    const { data: urlData } = supabase.storage.from('payment_proofs').getPublicUrl(path);

    const { error } = await supabase.from('payments').insert({
      user_id: user.id,
      amount: Number(amount),
      payer_name: payerName,
      proof_url: urlData.publicUrl,
    });

    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Bukti pembayaran terkirim! Menunggu konfirmasi admin.');
    setPayerName('');
    setProofFile(null);
    fetchPayments();
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      default: return 'Menunggu';
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Upgrade ke Premium</h1>
        <p className="text-muted-foreground">Nikmati fitur tanpa batas</p>
      </div>

      {isPremium && profile?.premium_until && (
        <div className="mb-8 rounded-xl border-2 border-accent bg-accent/10 p-6">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-accent" />
            <div>
              <p className="text-lg font-bold">Premium Aktif</p>
              <p className="text-sm text-muted-foreground">Berlaku sampai: {new Date(profile.premium_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* QRIS & Form */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Pembayaran via QRIS</h2>
            <div className="mb-4 overflow-hidden rounded-lg">
              <img src="/images/qris.jpg" alt="QRIS Payment" className="w-full" />
            </div>
            <p className="text-sm text-muted-foreground">Scan QRIS di atas, lalu upload bukti transfer.</p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Upload Bukti Transfer</h2>
            <div>
              <Label>Nama Pengirim *</Label>
              <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} required placeholder="Nama di rekening" />
            </div>
            <div>
              <Label>Nominal</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
            </div>
            <div>
              <Label>Bukti Transfer *</Label>
              <Input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)} required />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading || !proofFile || !payerName}>
              <Upload className="h-4 w-4" /> {loading ? 'Mengirim...' : 'Kirim Bukti'}
            </Button>
          </form>
        </div>

        {/* Payment History */}
        <div className="rounded-xl border bg-card">
          <div className="border-b p-5">
            <h2 className="font-semibold">Riwayat Pembayaran</h2>
          </div>
          {payments.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Belum ada pembayaran</div>
          ) : (
            <div className="divide-y">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-4">
                  {statusIcon(p.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{p.payer_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Rp {Number(p.amount).toLocaleString('id-ID')}</p>
                    <p className="text-xs text-muted-foreground">{statusLabel(p.status)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
