import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Building2, Pencil, Trash2, Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';

interface Institution {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

export default function Institutions() {
  const { user, isPremium } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [form, setForm] = useState({ name: '', email: '', address: '', phone: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [logoError, setLogoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInstitutions = async () => {
    if (!user) return;
    const { data } = await supabase.from('institutions').select('*').eq('user_id', user.id).order('created_at');
    setInstitutions((data as Institution[]) || []);
  };

  useEffect(() => { fetchInstitutions(); }, [user]);

  const canAddMore = isPremium || institutions.length < 1;

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Format file harus PNG, JPG, JPEG, atau SVG';
    if (file.size > MAX_FILE_SIZE) return 'Ukuran file maksimal 2MB';
    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setLogoError(error);
      return;
    }
    setLogoError('');
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCreate = () => {
    if (!canAddMore) {
      toast.error('Upgrade ke Premium untuk menambah instansi');
      return;
    }
    setEditing(null);
    setForm({ name: '', email: '', address: '', phone: '' });
    setLogoFile(null);
    setLogoPreview(null);
    setLogoError('');
    setDialogOpen(true);
  };

  const openEdit = (inst: Institution) => {
    setEditing(inst);
    setForm({ name: inst.name, email: inst.email || '', address: inst.address || '', phone: inst.phone || '' });
    setLogoFile(null);
    setLogoPreview(inst.logo_url || null);
    setLogoError('');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate logo
    if (!logoPreview && !editing?.logo_url) {
      setLogoError('Logo instansi wajib diisi');
      return;
    }

    setLoading(true);

    let logo_url = editing?.logo_url || null;

    if (logoFile) {
      setUploading(true);
      setUploadProgress(20);
      const ext = logoFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      
      setUploadProgress(50);
      const { error } = await supabase.storage.from('logos').upload(path, logoFile, {
        cacheControl: '31536000',
        upsert: false,
      });
      
      if (error) {
        toast.error('Gagal upload logo: ' + error.message);
        setLoading(false);
        setUploading(false);
        return;
      }

      setUploadProgress(80);
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      logo_url = urlData.publicUrl;
      setUploadProgress(100);
      setUploading(false);
    }

    const payload = {
      name: form.name,
      email: form.email || null,
      address: form.address || null,
      phone: form.phone || null,
      logo_url,
      user_id: user.id,
    };

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
                  <img src={inst.logo_url} alt={inst.name} className="h-10 w-10 rounded-lg object-contain" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
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
        <DialogContent className="max-w-md">
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

            {/* Logo Upload */}
            <div>
              <Label>Logo Instansi *</Label>
              {logoPreview ? (
                <div className="mt-2 flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
                  <img src={logoPreview} alt="Preview" className="h-16 w-16 rounded-lg object-contain" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{logoFile?.name || 'Logo saat ini'}</p>
                    {logoFile && <p className="text-xs text-muted-foreground">{(logoFile.size / 1024).toFixed(0)} KB</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1">
                      <Upload className="h-3 w-3" /> Ganti
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={removeLogo} className="text-destructive">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <div className={`mb-3 rounded-full p-3 ${isDragging ? 'bg-primary/10' : 'bg-muted'}`}>
                    <ImageIcon className={`h-6 w-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <p className="text-sm font-medium">
                    {isDragging ? 'Lepaskan file di sini' : 'Drag & drop logo di sini'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">atau klik untuk upload</p>
                  <p className="text-xs text-muted-foreground mt-2">PNG, JPG, JPEG, SVG • Maks 2MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg"
                onChange={handleInputChange}
                className="hidden"
              />
              {logoError && <p className="mt-1 text-sm text-destructive">{logoError}</p>}
            </div>

            {uploading && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">Mengupload logo...</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</span>
              ) : 'Simpan'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
