import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '../../lib/admin';

export const metadata: Metadata = {
  title: 'Administration',
  robots: { index: false, follow: false },
};

// Lit la session : jamais mise en cache.
export const dynamic = 'force-dynamic';

const LINKS = [
  { href: '/admin/stats', label: 'Entonnoir' },
  { href: '/admin/offres', label: 'Offres à valider' },
  { href: '/admin/ambassadeurs', label: 'Ambassadeurs' },
  { href: '/admin/droits', label: 'Droits et paiements' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Administration" className="flex flex-wrap gap-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold hover:border-ink">
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
