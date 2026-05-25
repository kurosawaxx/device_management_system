'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { useAuth } from '@/features/auth/model/auth-context';
import type { Device, User } from '@/shared/types';

const ROLE_LABEL: Record<string, string> = {
  system: 'システム管理者',
  admin: '管理者',
  user: '一般ユーザー',
};

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.new_password !== form.new_password_confirmation) {
      setError('新しいパスワードが一致しません');
      return;
    }
    setIsPending(true);
    try {
      await apiClient.put('/auth/change-password', form);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'パスワードの変更に失敗しました'
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">パスワード変更</h2>
        {success ? (
          <p className="text-sm text-green-600 text-center py-4">パスワードを変更しました</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">現在のパスワード</label>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={form.current_password}
                onChange={(e) => setForm((f) => ({ ...f, current_password: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">新しいパスワード（8文字以上）</label>
              <input
                required
                type="password"
                autoComplete="new-password"
                value={form.new_password}
                onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">新しいパスワード（確認）</label>
              <input
                required
                type="password"
                autoComplete="new-password"
                value={form.new_password_confirmation}
                onChange={(e) => setForm((f) => ({ ...f, new_password_confirmation: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? '変更中...' : '変更する'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const prefetch = (key: string[], fn: () => Promise<unknown>) => {
    queryClient.prefetchQuery({ queryKey: key, queryFn: fn, staleTime: 10_000 });
  };

  const prefetchUsers = () =>
    prefetch(['admin', 'users'], () =>
      apiClient.get<{ data: (User & { is_active: boolean })[] }>('/admin/users').then((r) => r.data.data)
    );

  const prefetchDevices = () =>
    prefetch(['admin', 'devices'], () =>
      apiClient.get<{ data: Device[] }>('/admin/devices').then((r) => r.data.data)
    );

  const prefetchLogs = () =>
    prefetch(['admin', 'reservation-logs', '1'], () =>
      apiClient.get('/admin/reservation-logs?page=1').then((r) => r.data)
    );

  const handleLogout = async () => {
    await logout();
    router.push('/signin');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'system';
  const isSystem = user?.role === 'system';

  return (
    <>
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-base font-bold text-gray-800 tracking-tight hover:text-blue-600 transition-colors">
              社内端末管理システム
            </Link>
            <a
              href="https://docs.google.com/spreadsheets/d/1y56oYbofX0x0Z0q5Wokf0StTmCtCUhKP/edit?gid=1305400789#gid=1305400789"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3 h-3">
                <rect x="2" y="2" width="10" height="10" rx="1" />
                <path d="M5 5h4M5 7h4M5 9h2" strokeLinecap="round" />
              </svg>
              管理台帳
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-2.5 h-2.5 opacity-60">
                <path d="M2 10L10 2M6 2h4v4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            {isAdmin && (
              <nav className="hidden sm:flex items-center gap-4 text-sm">
                {isAdmin && (
                  <Link href="/admin/devices" onMouseEnter={prefetchDevices} className="text-gray-500 hover:text-gray-800 transition-colors">
                    端末管理
                  </Link>
                )}
                {isSystem && (
                  <Link href="/admin/usage-logs" onMouseEnter={prefetchLogs} className="text-gray-500 hover:text-gray-800 transition-colors">
                    使用ログ
                  </Link>
                )}
                <Link href="/admin/users" onMouseEnter={prefetchUsers} className="text-gray-500 hover:text-gray-800 transition-colors">
                  ユーザー管理
                </Link>
              </nav>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-700 leading-none">{user.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{ROLE_LABEL[user.role]}</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                PW変更
              </button>
              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
