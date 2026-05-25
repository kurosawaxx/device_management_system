import { DeviceListWidget } from '@/widgets/device-list/ui/DeviceListWidget';

export function DeviceListPage() {
  return (
    <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">端末一覧</h2>
        <p className="text-sm text-gray-500 mt-1">
          使用状況はリアルタイムで更新されます
        </p>
      </div>
      <DeviceListWidget />
    </main>
  );
}
