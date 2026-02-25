import { Link } from 'react-router-dom';
import { FileText, Download, Clock, Shield, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

const features = [
  { icon: FileText, title: 'Buat Invoice Instan', desc: 'Isi data, generate PDF dalam hitungan detik.' },
  { icon: Download, title: 'Download & Print', desc: 'Unduh PDF profesional langsung dari browser.' },
  { icon: Clock, title: 'Riwayat Tersimpan', desc: 'Semua invoice tersimpan aman, bisa diakses kapan saja.' },
  { icon: Shield, title: 'Data Aman', desc: 'Enkripsi & keamanan tingkat enterprise.' },
];

const pricingFree = ['3 Invoice (lifetime)', '1 Instansi', 'Download PDF', '1 Template'];
const pricingPremium = ['Invoice Unlimited', 'Multi Instansi', 'Export PDF, Word, Excel', '3+ Template', 'Upload Logo Sendiri'];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/logo.png" alt="DitsGenInvoice" className="h-8 w-8" />
            <span className="text-lg font-bold text-gradient">DitsGenInvoice</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost">Login</Button></Link>
                <Link to="/register"><Button>Daftar Gratis</Button></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <div className="container relative mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl animate-fade-in">
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl">
              Buat Invoice Profesional{' '}
              <span className="text-gradient">dalam 1 Menit</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              Generator invoice online gratis. Isi data, pilih template, download PDF. Semudah itu.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to={user ? '/invoices/create' : '/login'}>
                <Button size="lg" className="gap-2 px-8 text-base">
                  <FileText className="h-5 w-5" />
                  Buat Invoice Sekarang
                </Button>
              </Link>
              <a href="#pricing">
                <Button size="lg" variant="outline" className="px-8 text-base">
                  Lihat Harga
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-card py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Kenapa DitsGenInvoice?</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-background p-6 transition-shadow hover:shadow-lg">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Pilih Paket</h2>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border bg-card p-8">
              <h3 className="mb-2 text-xl font-bold">Free</h3>
              <p className="mb-6 text-3xl font-extrabold">Rp 0<span className="text-base font-normal text-muted-foreground"> / selamanya</span></p>
              <ul className="mb-8 space-y-3">
                {pricingFree.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent" /> {item}
                  </li>
                ))}
              </ul>
              <Link to={user ? '/dashboard' : '/register'}>
                <Button variant="outline" className="w-full">Mulai Gratis</Button>
              </Link>
            </div>
            {/* Premium */}
            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-lg">
              <div className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                <Star className="mr-1 inline h-3 w-3" /> POPULER
              </div>
              <h3 className="mb-2 text-xl font-bold">Premium</h3>
              <p className="mb-6 text-3xl font-extrabold">Rp 15.000<span className="text-base font-normal text-muted-foreground"> / bulan</span></p>
              <ul className="mb-8 space-y-3">
                {pricingPremium.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent" /> {item}
                  </li>
                ))}
              </ul>
              <Link to={user ? '/upgrade' : '/register'}>
                <Button className="w-full">Upgrade Premium</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 DitsGenInvoice. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
