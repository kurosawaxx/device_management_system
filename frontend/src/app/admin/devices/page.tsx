'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/model/auth-context';
import { AdminDevicesPage } from '@/views/admin/devices';

export default function DevicesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.role !== 'system' && user?.role !== 'admin') {
      router.replace('/admin/users');
    }
  }, [user, isLoading, router]);

  if (isLoading || (user?.role !== 'system' && user?.role !== 'admin')) return null;

  return <AdminDevicesPage />;
}
