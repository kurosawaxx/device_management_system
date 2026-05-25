'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import type { Device, User } from '@/shared/types';

type LogEntry = {
  id: number;
  device: Pick<Device, 'id' | 'name' | 'model'>;
  user: Pick<User, 'id' | 'name'> | null;
  start_datetime: string;
  end_datetime: string;
  status: 'completed' | 'cancelled';
  notes: string | null;
};

type PaginatedResponse = {
  data: LogEntry[];
  current_page: number;
  last_page: number;
  total: number;
};

async function fetchLogs(page: number): Promise<PaginatedResponse> {
  const res = await apiClient.get<PaginatedResponse>(`/admin/reservation-logs?page=${page}`);
  return res.data;
}

function formatDT(dt: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dt));
}

function calcDuration(start: string, end: string): string {
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (diff < 60) return `${diff}分`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

import { useState } from 'react';

export function UsageLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reservation-logs', page],
    queryFn: () => fetchLogs(page),
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">使用ログ</h2>
        <p className="text-sm text-gray-500 mt-1">端末の使用・キャンセル履歴</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">端末</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">使用者</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">開始</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">終了</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">使用時間</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">状態</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">メモ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      ログがありません
                    </td>
                  </tr>
                )}
                {data?.data.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{log.device?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{log.device?.model}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.user?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDT(log.start_datetime)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDT(log.end_datetime)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.status === 'completed' ? calcDuration(log.start_datetime, log.end_datetime) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {log.status === 'completed' ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          完了
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                          キャンセル
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                      {log.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.last_page > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <p className="text-gray-500">全 {data.total} 件</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  前へ
                </button>
                <span className="px-3 py-1.5 text-gray-500">
                  {page} / {data.last_page}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === data.last_page}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
