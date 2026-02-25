import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Building2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

export default function Dashboard() {
  const { profile, isPremium, user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [institutionCount, setInstitutionCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setInvoices(data || []));
    supabase.from('institutions').select('id', { count: 'exact' }).eq('user_id', user.id)
      .then(({ count }) => setInstitutionCount(count || 0));
  }, [user]);

  const quotaUsed = profile?.invoice_quota_used ?? 0;
  const quotaMax = isPremium ? '∞' : '3';

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Selamat Datang{profile?.full_name ? `, ${profile.full_name}` : ''}!</h1>
        <p className="text-muted-foreground">Kelola invoice Anda dengan mudah.</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5"><FileText className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Invoice Dibuat</p>
              <p className="text-2xl font-bold">{quotaUsed}<span className="text-sm font-normal text-muted-foreground">/{quotaMax}</span></p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2.5"><Building2 className="h-5 w-5 text-accent" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Instansi</p>
              <p className="text-2xl font-bold">{institutionCount}<span className="text-sm font-normal text-muted-foreground">/{isPremium ? '∞' : '1'}</span></p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2.5"><Crown className="h-5 w-5 text-warning" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Paket</p>
              <p className="text-2xl font-bold">{isPremium ? 'Premium' : 'Free'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 flex items-center justify-center">
          <Link to="/invoices/create">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" /> Buat Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-semibold">Invoice Terbaru</h2>
          <Link to="/invoices"><Button variant="ghost" size="sm">Lihat Semua</Button></Link>
        </div>
        {invoices.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>Belum ada invoice. <Link to="/invoices/create" className="text-primary hover:underline">Buat sekarang</Link></p>
          </div>
        ) : (
          <div className="divide-y">
            {invoices.map((inv) => (
              <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">{inv.invoice_number}</p>
                  <p className="text-sm text-muted-foreground">{inv.client_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Rp {Number(inv.total).toLocaleString('id-ID')}</p>
                  <p className="text-xs text-muted-foreground">{new Date(inv.date).toLocaleDateString('id-ID')}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
