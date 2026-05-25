'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { DeviceCard } from '@/entities/device/ui/DeviceCard';
import { ReservationModal } from '@/features/reservation/ui/ReservationModal';
import type { Device } from '@/shared/types';

async function fetchDevices(): Promise<Device[]> {
  const res = await apiClient.get<{ data: Device[] }>('/devices');
  return res.data.data;
}

export function DeviceListWidget() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  const { data: devices, isLoading, isError } = useQuery({
    queryKey: ['devices'],
    queryFn: fetchDevices,
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
        端末情報の取得に失敗しました。ページを再読み込みしてください。
      </div>
    );
  }

  if (!devices || devices.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 p-10 text-center text-gray-400">
        登録されている端末がありません
      </div>
    );
  }

  const inUse = devices.filter((d) => d.current_reservation);
  const reserved = devices.filter((d) => !d.current_reservation && d.upcoming_reservation);
  const available = devices.filter((d) => !d.current_reservation && !d.upcoming_reservation);

  const DeviceGrid = ({ list }: { list: Device[] }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {list.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          onClick={() => setSelectedDeviceId(device.id)}
        />
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-8">
        {inUse.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              使用中 ({inUse.length})
            </h2>
            <DeviceGrid list={inUse} />
          </section>
        )}

        {reserved.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              予約済み ({reserved.length})
            </h2>
            <DeviceGrid list={reserved} />
          </section>
        )}

        {available.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              空き ({available.length})
            </h2>
            <DeviceGrid list={available} />
          </section>
        )}
      </div>

      {selectedDeviceId !== null && (
        <ReservationModal
          deviceId={selectedDeviceId}
          onClose={() => setSelectedDeviceId(null)}
        />
      )}
    </>
  );
}
