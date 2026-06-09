'use client';

import { Fragment, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { useAuth } from '@/features/auth/model/auth-context';
import type { Device, DeviceType } from '@/shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export function deviceImageUrl(path: string | null): string | null {
  if (!path) return null;
  return `${API_BASE_URL}/storage/${path}`;
}

async function fetchAdminDevices(): Promise<Device[]> {
  const res = await apiClient.get<{ data: Device[] }>('/admin/devices');
  return res.data.data;
}

const TYPE_LABEL: Record<DeviceType, string> = {
  phone: 'スマートフォン',
  tablet: 'タブレット',
  other: 'PC',
};

type DeviceFormData = {
  name: string;
  model: string;
  type: DeviceType;
  description: string;
  is_active: boolean;
};

const EMPTY_FORM: DeviceFormData = {
  name: '',
  model: '',
  type: 'phone',
  description: '',
  is_active: true,
};

function buildFormData(form: DeviceFormData, imageFile: File | null, clearImage: boolean, method?: string, adminOnly = false): FormData {
  const fd = new FormData();
  if (method) fd.append('_method', method);
  fd.append('name', form.name);
  fd.append('model', form.model);
  if (!adminOnly) {
    fd.append('type', form.type);
    fd.append('description', form.description);
    fd.append('is_active', form.is_active ? '1' : '0');
  }
  if (imageFile) fd.append('image', imageFile);
  else if (clearImage) fd.append('clear_image', '1');
  return fd;
}

export function AdminDevicesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [form, setForm] = useState<DeviceFormData>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [error, setError] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: devices, isLoading } = useQuery({
    queryKey: ['admin', 'devices'],
    queryFn: fetchAdminDevices,
  });

  const multipartHeaders = { 'Content-Type': 'multipart/form-data' };

  const createMutation = useMutation({
    mutationFn: (fd: FormData) =>
      apiClient.post('/admin/devices', fd, { headers: multipartHeaders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      closeForm();
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          '作成に失敗しました'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, fd }: { id: number; fd: FormData }) =>
      apiClient.post(`/admin/devices/${id}`, fd, { headers: multipartHeaders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      closeForm();
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          '更新に失敗しました'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/admin/devices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const closeForm = () => {
    setIsExiting(false);
    setShowForm(false);
    setEditDevice(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setClearImage(false);
    setError('');
  };

  const closeFormAnimated = () => {
    setIsExiting(true);
    setTimeout(closeForm, 260);
  };

  const handleOpenCreate = () => {
    closeForm();
    setShowForm(true);
  };

  const handleOpenEdit = (device: Device) => {
    if (showForm && editDevice?.id === device.id) {
      closeFormAnimated();
      return;
    }
    setEditDevice(device);
    setForm({
      name: device.name,
      model: device.model,
      type: device.type,
      description: device.description ?? '',
      is_active: device.is_active,
    });
    setImageFile(null);
    setImagePreview(deviceImageUrl(device.image_path));
    setClearImage(false);
    setError('');
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (editDevice) {
      const fd = buildFormData(form, imageFile, clearImage, 'PUT', isAdmin);
      updateMutation.mutate({ id: editDevice.id, fd });
    } else {
      const fd = buildFormData(form, imageFile, false);
      createMutation.mutate(fd);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const renderDeviceForm = (isInline = false) => (
    <div className={`${isInline ? 'rounded-lg' : 'mb-6 rounded-xl'} border border-gray-200 bg-white p-6`}>
      <h3 className="text-base font-semibold text-gray-800 mb-4">
        {editDevice ? '端末編集' : '新規端末'}
      </h3>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">端末名</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">機種名</label>
          <input
            required
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {(!isAdmin || !editDevice) && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">タイプ</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DeviceType }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="phone">スマートフォン</option>
                <option value="tablet">タブレット</option>
                <option value="other">PC</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">状態</label>
              <select
                value={form.is_active ? 'true' : 'false'}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === 'true' }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="true">有効</option>
                <option value="false">無効</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">説明（任意）</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
          </>
        )}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            端末画像（任意・5MB以内）
          </label>
          <div className="flex items-center gap-4">
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="プレビュー"
                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
              />
            )}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {imagePreview ? '画像を変更' : '画像を選択'}
              </button>
              {imageFile && (
                <span className="ml-3 text-xs text-gray-500">{imageFile.name}</span>
              )}
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                    setClearImage(true);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="ml-3 text-xs text-red-500 hover:text-red-700 underline"
                >
                  画像を削除
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="col-span-2 flex gap-3 justify-end">
          <button
            type="button"
            onClick={closeFormAnimated}
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
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">端末管理</h2>
          <p className="text-sm text-gray-500 mt-1">端末の登録・編集・無効化</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + 端末追加
        </button>
      </div>

      {showForm && !editDevice && (
        <div className={isExiting ? 'device-edit-form-exit' : 'device-edit-form-enter'}>
          {renderDeviceForm()}
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">画像</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">端末名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">機種名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">タイプ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">状態</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devices?.map((device) => {
                const imgUrl = deviceImageUrl(device.image_path);
                const isEditing = showForm && editDevice?.id === device.id;
                return (
                  <Fragment key={device.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgUrl}
                            alt={device.name}
                            className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                              <rect x="5" y="2" width="14" height="20" rx="2" />
                              <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px]"><div className="line-clamp-2">{device.name}</div></td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px]"><div className="line-clamp-2">{device.model}</div></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {TYPE_LABEL[device.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            device.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {device.is_active ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(device)}
                            title="編集"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3 h-3">
                              <path d="M9.5 2l2.5 2.5-7 7H2.5V9L9.5 2z" strokeLinejoin="round" />
                            </svg>
                            編集
                          </button>
                          {user?.role === 'system' && (
                            <button
                              onClick={() => {
                                if (confirm(`${device.name} を完全に削除しますか？\nこの操作は取り消せません。`)) {
                                  deleteMutation.mutate(device.id);
                                }
                              }}
                              title="削除"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3 h-3">
                                <path d="M2 4h10M5 4V2.5h4V4M6 6.5v4M8 6.5v4M3 4l.7 7.5h6.6L11 4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              削除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isEditing && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 px-4 py-4">
                          <div className={isExiting ? 'device-edit-form-exit' : 'device-edit-form-enter'}>
                            {renderDeviceForm(true)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
