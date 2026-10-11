import Image from 'next/image';
import Link from 'next/link';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard">
            <Image
              src="/images/logo_xyntel.png"
              alt="Xyntel Monitor"
              width={120}
              height={33}
              priority
            />
          </Link>
          <DashboardNav />
        </header>
        {children}
      </div>
    </div>
  );
}
