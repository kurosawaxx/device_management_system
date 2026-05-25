import type { Device } from '@/shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const DEVICE_TYPE_LABEL: Record<string, string> = {
  phone: 'スマートフォン',
  tablet: 'タブレット',
  other: 'PC',
};

function formatDateTime(dt: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dt));
}

function DevicePlaceholder({ type }: { type: string }) {
  if (type === 'tablet') {
    return (
      <svg viewBox="0 0 64 64" fill="none" className="w-12 h-12 text-gray-300" stroke="currentColor" strokeWidth={2}>
        <rect x="10" y="6" width="44" height="52" rx="4" />
        <circle cx="32" cy="52" r="2" fill="currentColor" stroke="none" />
        <rect x="16" y="12" width="32" height="34" rx="1" fill="currentColor" opacity="0.15" stroke="none" />
      </svg>
    );
  }
  if (type === 'phone') {
    return (
      <svg viewBox="0 0 64 64" fill="none" className="w-10 h-12 text-gray-300" stroke="currentColor" strokeWidth={2}>
        <rect x="16" y="4" width="32" height="56" rx="5" />
        <circle cx="32" cy="54" r="2.5" fill="currentColor" stroke="none" />
        <rect x="22" y="10" width="20" height="36" rx="1" fill="currentColor" opacity="0.15" stroke="none" />
        <rect x="26" y="7" width="12" height="2" rx="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" fill="none" className="w-14 h-12 text-gray-300" stroke="currentColor" strokeWidth={2}>
      <rect x="6" y="10" width="52" height="34" rx="3" />
      <rect x="12" y="16" width="40" height="22" rx="1" fill="currentColor" opacity="0.12" stroke="none" />
      <path d="M2 46h60" strokeLinecap="round" />
      <path d="M20 46l-3 6h30l-3-6" fill="currentColor" opacity="0.2" stroke="none" />
      <path d="M20 46l-3 6h30l-3-6" strokeLinejoin="round" />
    </svg>
  );
}

type Props = { device: Device; onClick?: () => void };

export function DeviceCard({ device, onClick }: Props) {
  const current = device.current_reservation;
  const upcoming = device.upcoming_reservation;
  const isInUse = !!current;
  const isReserved = !isInUse && !!upcoming;
  const imgUrl = device.image_path ? `${API_BASE_URL}/storage/${device.image_path}` : null;

  const statusBadge = isInUse
    ? { label: '使用中', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700' }
    : isReserved
    ? { label: '予約済み', dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700' }
    : { label: '空き', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700' };

  return (
    <button
      onClick={onClick}
      className="flex flex-col w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-5 cursor-pointer"
    >
      {imgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl}
          alt={device.name}
          className="w-full h-32 object-cover rounded-lg mb-3 border border-gray-100"
        />
      ) : (
        <div className="w-full h-32 rounded-lg mb-3 bg-gray-50 border border-gray-100 flex items-center justify-center">
          <DevicePlaceholder type={device.type} />
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-snug truncate">
            {device.name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{device.model}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
          {statusBadge.label}
        </span>
      </div>

      <span className="inline-block w-fit text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 mb-3">
        {DEVICE_TYPE_LABEL[device.type] ?? device.type}
      </span>

      {isInUse && current && (
        <div className="mt-auto pt-3 border-t border-red-100 bg-red-50 -mx-5 -mb-5 px-5 pb-5 rounded-b-xl">
          <p className="text-xs font-semibold text-red-700 mb-0.5">
            {current.user?.name ?? '不明'} さんが使用中
          </p>
          <p className="text-xs text-red-600">
            {formatDateTime(current.end_datetime)} まで
          </p>
        </div>
      )}

      {isReserved && upcoming && (
        <div className="mt-auto pt-3 border-t border-yellow-100 bg-yellow-50 -mx-5 -mb-5 px-5 pb-5 rounded-b-xl">
          <p className="text-xs font-semibold text-yellow-700 mb-0.5">
            {upcoming.user?.name ?? '不明'} さんが予約中
          </p>
          <p className="text-xs text-yellow-600">
            {formatDateTime(upcoming.start_datetime)} 〜
          </p>
        </div>
      )}

      {!isInUse && !isReserved && (
        <div className="mt-auto pt-3 border-t border-gray-100">
          <span className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <rect x="2" y="3" width="12" height="11" rx="1.5" />
              <path d="M5 1v3M11 1v3M2 7h12" strokeLinecap="round" />
            </svg>
            予約する
          </span>
        </div>
      )}
    </button>
  );
}
