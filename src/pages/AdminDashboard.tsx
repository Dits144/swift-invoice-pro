import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Search, Image, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const fetchPayments = async () => {
    // Admin can see all payments via RLS policy
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

  const filtered = payments.filter((p) => {
    const matchSearch = p.payer_name.toLowerCase().includes(search.toLowerCase());
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
                      <a href={p.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Image className="h-4 w-4" /> Lihat
                      </a>
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
    </DashboardLayout>
  );
}
