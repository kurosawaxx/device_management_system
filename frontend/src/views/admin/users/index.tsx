'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { useAuth } from '@/features/auth/model/auth-context';
import type { User, UserRole } from '@/shared/types';

type AdminUser = User & { is_active: boolean; created_at: string };

async function fetchUsers(): Promise<AdminUser[]> {
  const res = await apiClient.get<{ data: AdminUser[] }>('/admin/users');
  return res.data.data;
}

const ROLE_LABEL: Record<UserRole, string> = {
  system: 'システム管理者',
  admin: '管理者',
  user: '一般ユーザー',
};

type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  chatwork_account_id: string;
};

const EMPTY_FORM: UserFormData = { name: '', email: '', password: '', role: 'user', chatwork_account_id: '' };

export function AdminUsersPage() {
  const { user: authUser } = useAuth();
  const isSystem = authUser?.role === 'system';
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchUsers,
  });

  const createMutation = useMutation({
    mutationFn: (data: UserFormData) => apiClient.post('/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setError('');
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          '作成に失敗しました'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserFormData> & { is_active?: boolean } }) =>
      apiClient.put(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowForm(false);
      setEditUser(null);
      setForm(EMPTY_FORM);
      setError('');
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          '更新に失敗しました'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/admin/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const handleOpenCreate = () => {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const handleOpenEdit = (user: AdminUser) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, chatwork_account_id: user.chatwork_account_id ?? '' });
    setEditIsActive(user.is_active ?? true);
    setError('');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (editUser) {
      const data: Partial<UserFormData> & { is_active?: boolean } = {
        name: form.name,
        email: form.email,
        role: form.role,
        chatwork_account_id: form.chatwork_account_id || undefined,
        ...(isSystem && { is_active: editIsActive }),
      };
      if (form.password) data.password = form.password;
      updateMutation.mutate({ id: editUser.id, data });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ユーザー管理</h2>
          <p className="text-sm text-gray-500 mt-1">社員アカウントの管理</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + ユーザー追加
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            {editUser ? 'ユーザー編集' : '新規ユーザー'}
          </h3>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">名前</label>
              <input
                required
                autoComplete="off"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">メールアドレス</label>
              <input
                required
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                パスワード{editUser && ' (変更する場合のみ)'}
              </label>
              <input
                required={!editUser}
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {isSystem && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">権限</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="user">一般ユーザー</option>
                  <option value="admin">管理者</option>
                  <option value="system">システム管理者</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Chatwork アカウントID</label>
              <input
                type="text"
                value={form.chatwork_account_id}
                onChange={(e) => setForm((f) => ({ ...f, chatwork_account_id: e.target.value }))}
                placeholder="例: 12345678"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {isSystem && editUser && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">アカウント状態</label>
                <button
                  type="button"
                  onClick={() => setEditIsActive((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editIsActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editIsActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="ml-2 text-sm text-gray-600">{editIsActive ? '有効' : '無効'}</span>
              </div>
            )}
            <div className="col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">名前</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">メール</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">権限</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">状態</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Chatwork ID</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {ROLE_LABEL[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {user.is_active ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {user.chatwork_account_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        title="編集"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3 h-3">
                          <path d="M9.5 2l2.5 2.5-7 7H2.5V9L9.5 2z" strokeLinejoin="round" />
                        </svg>
                        編集
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`${user.name} を削除しますか？`)) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                        title="削除"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3 h-3">
                          <path d="M2 3.5h10M5.5 3.5V2h3v1.5M4 3.5l.7 8h4.6l.7-8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
