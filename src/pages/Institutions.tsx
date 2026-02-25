import { useEffect, useState } from 'react';
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';

const defaultLogos = Array.from({ length: 10 }, (_, i) => `default-${i + 1}`);
const logoEmojis: Record<string, string> = {
  'default-1': '🏢', 'default-2': '🏬', 'default-3': '🏗️', 'default-4': '🏪',
  'default-5': '🏛️', 'default-6': '📦', 'default-7': '🛒', 'default-8': '💼',
  'default-9': '🔧', 'default-10': '🎨',
};

interface Institution {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  phone: string | null;
  logo_type: string | null;
  logo_url: string | null;
}

export default function Institutions() {
  const { user, isPremium } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [form, setForm] = useState({ name: '', email: '', address: '', phone: '', logo_type: 'default-1' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInstitutions = async () => {
    if (!user) return;
    const { data } = await supabase.from('institutions').select('*').eq('user_id', user.id).order('created_at');
    setInstitutions((data as Institution[]) || []);
  };

  useEffect(() => { fetchInstitutions(); }, [user]);

  const canAddMore = isPremium || institutions.length < 1;

  const openCreate = () => {
    if (!canAddMore) {
      toast.error('Upgrade ke Premium untuk menambah instansi');
      return;
    }
    setEditing(null);
    setForm({ name: '', email: '', address: '', phone: '', logo_type: 'default-1' });
    setLogoFile(null);
    setDialogOpen(true);
  };

  const openEdit = (inst: Institution) => {
    setEditing(inst);
    setForm({ name: inst.name, email: inst.email || '', address: inst.address || '', phone: inst.phone || '', logo_type: inst.logo_type || 'default-1' });
    setLogoFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    let logo_url = editing?.logo_url || null;
    if (isPremium && logoFile) {
      const path = `${user.id}/${Date.now()}-${logoFile.name}`;
      const { error } = await supabase.storage.from('logos').upload(path, logoFile);
      if (!error) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
        logo_url = urlData.publicUrl;
      }
    }

    const payload = { name: form.name, email: form.email || null, address: form.address || null, phone: form.phone || null, logo_type: form.logo_type, logo_url, user_id: user.id };

    if (editing) {
      const { error } = await supabase.from('institutions').update(payload).eq('id', editing.id);
      if (error) toast.error(error.message);
      else toast.success('Instansi diperbarui');
    } else {
      const { error } = await supabase.from('institutions').insert(payload);
      if (error) toast.error(error.message);
      else toast.success('Instansi ditambahkan');
    }

    setLoading(false);
    setDialogOpen(false);
    fetchInstitutions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus instansi ini?')) return;
    await supabase.from('institutions').delete().eq('id', id);
    toast.success('Instansi dihapus');
    fetchInstitutions();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Instansi</h1>
          <p className="text-sm text-muted-foreground">Kelola profil perusahaan Anda</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Tambah</Button>
      </div>

      {institutions.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          <Building2 className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p>Belum ada instansi. Tambahkan untuk mulai membuat invoice.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutions.map((inst) => (
            <div key={inst.id} className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                {inst.logo_url ? (
                  <img src={inst.logo_url} alt={inst.name} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                    {logoEmojis[inst.logo_type || 'default-1'] || '🏢'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{inst.name}</p>
                  {inst.email && <p className="text-xs text-muted-foreground truncate">{inst.email}</p>}
                </div>
              </div>
              {inst.address && <p className="mb-3 text-sm text-muted-foreground">{inst.address}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(inst)} className="gap-1"><Pencil className="h-3 w-3" /> Edit</Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(inst.id)} className="gap-1 text-destructive"><Trash2 className="h-3 w-3" /> Hapus</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Instansi' : 'Tambah Instansi'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nama Instansi *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Alamat</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Telepon</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Logo</Label>
              {isPremium ? (
                <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
              ) : (
                <Select value={form.logo_type} onValueChange={(v) => setForm({ ...form, logo_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {defaultLogos.map((l) => (
                      <SelectItem key={l} value={l}>{logoEmojis[l]} {l.replace('default-', 'Logo ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
