'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import MetricCard from '@/components/metric-card';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState({ tenants: 0, users: 0 });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/admin/login'); return; }
    setLoaded(true);
    Promise.all([
      api('/tenants').then((r) => setStats((s) => ({ ...s, tenants: r.data.length }))),
      api('/users').then((r) => setStats((s) => ({ ...s, users: r.data.length }))),
    ]).catch(() => {});
  }, [router]);

  if (!loaded) return null;

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-ink mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard value={String(stats.tenants)} label="Tenants" stripColor="#10b981" />
        <MetricCard value={String(stats.users)} label="Usuários" stripColor="#f59e0b" />
      </div>
    </div>
  );
}
