import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setInvoices(data || []));
  }, [user]);

  const filtered = invoices.filter((inv) =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    inv.client_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoice</h1>
          <p className="text-sm text-muted-foreground">Daftar semua invoice Anda</p>
        </div>
        <Link to="/invoices/create">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Buat Invoice</Button>
        </Link>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari nomor invoice atau klien..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>Tidak ada invoice ditemukan.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((inv) => (
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
