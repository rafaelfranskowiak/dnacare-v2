'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    setLoaded(true);
  }, [router]);

  if (!loaded) return null;

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-ink mb-6">Dashboard</h1>
      <div className="rounded-xl border border-edge bg-surface p-8 shadow-sm text-center">
        <p className="text-ink-tertiary">Bem-vindo ao seu dashboard.</p>
      </div>
    </div>
  );
}
