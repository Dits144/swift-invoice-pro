import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Search, Eye, ExternalLink, X, FileText, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPayment, setPreviewPayment] = useState<any>(null);

  const fetchPayments = async () => {
    const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    setPayments(data || []);
  };

  useEffect(() => { fetchPayments(); }, []);

  const handleApprove = async (paymentId: string) => {
    if (!user) return;
    setActionLoading(paymentId);
    const { error } = await supabase.rpc('approve_payment', { _payment_id: paymentId, _admin_id: user.id });
    setActionLoading(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Pembayaran disetujui! User sekarang Premium.');
    fetchPayments();
  };

  const handleReject = async (paymentId: string) => {
    if (!user) return;
    setActionLoading(paymentId);
    const { error } = await supabase.rpc('reject_payment', { _payment_id: paymentId, _admin_id: user.id });
    setActionLoading(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Pembayaran ditolak.');
    fetchPayments();
  };

  const handleViewProof = async (payment: any) => {
    if (!payment.proof_url) {
      toast.error('Tidak ada file bukti transfer.');
      return;
    }

    setPreviewPayment(payment);
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewUrl(null);

    // proof_url could be a storage path or a full URL (legacy)
    const proofPath = payment.proof_url;
    const isFullUrl = proofPath.startsWith('http');

    if (isFullUrl) {
      // Legacy: proof_url is already a full URL, try using it directly
      setPreviewUrl(proofPath);
      setPreviewLoading(false);
      return;
    }

    // Generate signed URL for private bucket
    const { data, error } = await supabase.storage.from('payment_proofs').createSignedUrl(proofPath, 300); // 5 min
    if (error || !data?.signedUrl) {
      toast.error('Gagal memuat bukti transfer. File mungkin tidak ditemukan.');
      setPreviewLoading(false);
      return;
    }

    setPreviewUrl(data.signedUrl);
    setPreviewLoading(false);
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);

  const filtered = payments.filter((p) => {
    const matchSearch = p.payer_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Kelola pembayaran premium</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-semibold">Nama</th>
                <th className="p-3 text-left font-semibold">User ID</th>
                <th className="p-3 text-left font-semibold">Nominal</th>
                <th className="p-3 text-left font-semibold">Tanggal</th>
                <th className="p-3 text-left font-semibold">Bukti</th>
                <th className="p-3 text-left font-semibold">Status</th>
                <th className="p-3 text-left font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">Tidak ada data</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{p.payer_name}</td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">{p.user_id?.slice(0, 8)}...</td>
                    <td className="p-3">Rp {Number(p.amount).toLocaleString('id-ID')}</td>
                    <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="p-3">
                      {p.proof_url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewProof(p)}
                          className="gap-1.5 h-8"
                        >
                          <Eye className="h-3.5 w-3.5" /> Lihat Bukti
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Tidak ada file</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === 'approved' ? 'bg-success/10 text-success' :
                        p.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {p.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                        {p.status === 'rejected' && <XCircle className="h-3 w-3" />}
                        {p.status === 'pending' && <Clock className="h-3 w-3" />}
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-3">
                      {p.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(p.id)} disabled={actionLoading === p.id} className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> ACC
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(p.id)} disabled={actionLoading === p.id} className="gap-1 text-destructive">
                            <XCircle className="h-3 w-3" /> Tolak
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" /> Bukti Transfer
            </DialogTitle>
          </DialogHeader>
          {previewPayment && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Nama: <strong className="text-foreground">{previewPayment.payer_name}</strong></span>
                <span>{new Date(previewPayment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          )}
          <div className="mt-2 min-h-[200px] flex items-center justify-center rounded-lg border bg-muted/20">
            {previewLoading ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm">Memuat...</span>
              </div>
            ) : previewUrl ? (
              isImageUrl(previewUrl) ? (
                <img src={previewUrl} alt="Bukti Transfer" className="max-h-[400px] w-auto rounded-lg object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-3 p-6">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">File PDF</p>
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground">File tidak ditemukan</p>
            )}
          </div>
          {previewUrl && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" asChild className="gap-1.5">
                <a href={previewUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Buka di Tab Baru
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
