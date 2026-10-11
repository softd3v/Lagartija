'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  {
    href: '/dashboard',
    label: 'Monitoring',
    match: (path: string) =>
      path === '/dashboard' || path.startsWith('/dashboard/endpoints'),
  },
  {
    href: '/dashboard/webhooks',
    label: 'Webhooks',
    match: (path: string) => path.startsWith('/dashboard/webhooks'),
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {LINKS.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active ? 'bg-[#cc0000] text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
