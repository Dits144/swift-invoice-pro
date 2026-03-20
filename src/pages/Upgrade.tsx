import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Crown, Clock, CheckCircle2, XCircle, FileImage, FileText, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function Upgrade() {
  const { user, isPremium, profile } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState('15000');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const fetchPayments = async () => {
    if (!user) return;
    const { data } = await supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPayments(data || []);
  };

  useEffect(() => { fetchPayments(); }, [user]);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.';
    if (file.size > MAX_SIZE) return 'Ukuran file maksimal 5MB.';
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) { toast.error(error); return; }
    setProofFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setProofPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  }, []);

  const clearFile = () => {
    setProofFile(null);
    setProofPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !proofFile || !payerName) return;
    setLoading(true);
    setUploadProgress(10);

    const ext = proofFile.name.split('.').pop();
    const path = `${user.id}/${Date.now()}-bukti.${ext}`;
    setUploadProgress(30);

    const { error: uploadErr } = await supabase.storage.from('payment_proofs').upload(path, proofFile);
    if (uploadErr) { toast.error('Gagal upload bukti: ' + uploadErr.message); setLoading(false); setUploadProgress(0); return; }
    setUploadProgress(70);

    const { error } = await supabase.from('payments').insert({
      user_id: user.id,
      amount: Number(amount),
      payer_name: payerName,
      proof_url: path, // Store path only, not full URL
    });

    setUploadProgress(100);
    setLoading(false);
    if (error) { toast.error(error.message); setUploadProgress(0); return; }
    toast.success('Bukti pembayaran terkirim! Menunggu konfirmasi admin.');
    setPayerName('');
    clearFile();
    setUploadProgress(0);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

            {/* Drag & Drop Upload Area */}
            <div>
              <Label>Bukti Transfer *</Label>
              {!proofFile ? (
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 ${
                    isDragging
                      ? 'border-primary bg-primary/5 scale-[1.01]'
                      : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <Upload className={`mb-3 h-10 w-10 ${isDragging ? 'text-primary' : 'text-muted-foreground/50'}`} />
                  <p className="text-sm font-medium text-foreground">
                    {isDragging ? 'Lepaskan file di sini' : 'Drag & drop bukti transfer di sini'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">atau klik untuk pilih file</p>
                  <p className="mt-2 text-xs text-muted-foreground/70">Format: JPG, PNG, WEBP, PDF • Maks 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                  />
                </div>
              ) : (
                <div className="mt-2 rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    {proofPreview ? (
                      <img src={proofPreview} alt="Preview" className="h-20 w-20 rounded-lg object-cover border" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-muted">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{proofFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(proofFile.size)}</p>
                      <div className="mt-2 flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="h-7 gap-1 text-xs">
                          <RefreshCw className="h-3 w-3" /> Ganti
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={clearFile} className="h-7 gap-1 text-xs text-destructive hover:text-destructive">
                          <X className="h-3 w-3" /> Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                  />
                </div>
              )}
            </div>

            {/* Upload progress */}
            {loading && uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
              </div>
            )}

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
