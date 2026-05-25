'use client';

import { FormEvent, forwardRef, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { apiClient } from '@/shared/api/client';
import type { Device, Reservation, User } from '@/shared/types';
import { useAuth } from '@/features/auth/model/auth-context';

registerLocale('ja', ja);

type DateInputProps = React.HTMLProps<HTMLInputElement> & { hasValue: boolean };
const PlaceholderDateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onClick, onChange, hasValue, placeholder, className }, ref) => (
    <input
      ref={ref}
      value={hasValue ? (value as string) : ''}
      onClick={onClick}
      onChange={onChange ?? (() => {})}
      placeholder={placeholder}
      className={className}
      readOnly
    />
  )
);
PlaceholderDateInput.displayName = 'PlaceholderDateInput';

type Props = {
  deviceId: number;
  onClose: () => void;
};

async function fetchDevice(id: number): Promise<Device> {
  const res = await apiClient.get<{ data: Device }>(`/devices/${id}`);
  return res.data.data;
}

async function fetchUsers(): Promise<(User & { is_active: boolean })[]> {
  const res = await apiClient.get<{ data: (User & { is_active: boolean })[] }>('/admin/users');
  return res.data.data;
}

async function createReservation(payload: {
  device_id: number;
  user_id?: number;
  start_datetime: string;
  end_datetime: string;
  notes?: string;
}): Promise<Reservation> {
  const res = await apiClient.post<{ data: Reservation }>('/reservations', payload);
  return res.data.data;
}

async function cancelReservation(id: number): Promise<void> {
  await apiClient.put(`/reservations/${id}/cancel`);
}

async function completeReservation(id: number): Promise<void> {
  await apiClient.put(`/reservations/${id}/complete`);
}

async function updateEndTime(id: number, end_datetime: string): Promise<Reservation> {
  const res = await apiClient.patch<{ data: Reservation }>(`/reservations/${id}/end-time`, { end_datetime });
  return res.data.data;
}

function formatDT(dt: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dt));
}

const DEVICE_TYPE_LABEL: Record<string, string> = {
  phone: 'スマートフォン',
  tablet: 'タブレット',
  other: 'PC',
};

const QUICK_DURATIONS = [
  { label: '15分', minutes: 15 },
  { label: '30分', minutes: 30 },
  { label: '45分', minutes: 45 },
  { label: '1時間', minutes: 60 },
  { label: '1時間15分', minutes: 75 },
  { label: '1時間30分', minutes: 90 },
  { label: '1時間45分', minutes: 105 },
  { label: '2時間', minutes: 120 },
];

const TRANSITION_MS = 220;

const datepickerClass = (base: string) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none ${base}`;

export function ReservationModal({ deviceId, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'system';

  const [visible, setVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [startDT, setStartDT] = useState<Date | null>(null);
  const [endDT, setEndDT] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [useNowError, setUseNowError] = useState('');
  const [useNowEnd, setUseNowEnd] = useState<Date | null>(null);
  const [endTimeError, setEndTimeError] = useState('');
  const [adjustEndDT, setAdjustEndDT] = useState<Date | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, TRANSITION_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data: device, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => fetchDevice(deviceId),
    placeholderData: () => {
      const list = queryClient.getQueryData<Device[]>(['devices']);
      return list?.find((d) => d.id === deviceId);
    },
  });

  const { data: users } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchUsers,
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      handleClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '予約に失敗しました';
      setFormError(msg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
    },
    onError: () => setFormError('キャンセルに失敗しました'),
  });

  const completeMutation = useMutation({
    mutationFn: completeReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      handleClose();
    },
    onError: () => setFormError('返却処理に失敗しました'),
  });

  const updateEndTimeMutation = useMutation({
    mutationFn: ({ id, end_datetime }: { id: number; end_datetime: string }) =>
      updateEndTime(id, end_datetime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      setEndTimeError('');
      handleClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '終了時刻の変更に失敗しました';
      setEndTimeError(msg);
    },
  });

  const handleAdjustSubmit = () => {
    if (!currentReservation || !adjustEndDT) return;
    if (adjustEndDT <= new Date()) {
      completeMutation.mutate(currentReservation.id);
    } else {
      updateEndTimeMutation.mutate({
        id: currentReservation.id,
        end_datetime: adjustEndDT.toISOString(),
      });
    }
  };

  const targetUserId = selectedUserId !== '' ? selectedUserId : undefined;

  const occupiedRanges = (device?.reservations ?? [])
    .filter((r) => r.status === 'reserved' || r.status === 'in_use')
    .map((r) => ({ start: new Date(r.start_datetime), end: new Date(r.end_datetime) }));

  const checkOverlap = (start: Date, end: Date): boolean =>
    occupiedRanges.some((r) => start < r.end && end > r.start);

  const filterStartTime = (time: Date): boolean => {
    if (time < new Date()) return false;
    return !occupiedRanges.some((r) => time >= r.start && time < r.end);
  };

  const filterEndTime = (time: Date): boolean => {
    if (!startDT) return time >= new Date();
    return !occupiedRanges.some((r) => startDT < r.end && time > r.start);
  };

  const nextReservationAfterStart = startDT
    ? occupiedRanges
        .filter((r) => r.start >= startDT)
        .sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null
    : null;

  const handleUseNow = (end: Date | null) => {
    setUseNowError('');
    if (!end) return;
    const start = new Date();
    if (checkOverlap(start, end)) {
      setUseNowError('選択した時間帯はすでに予約されているため使用できません。');
      return;
    }
    createMutation.mutate({
      device_id: deviceId,
      user_id: targetUserId,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
    });
  };

  const handleQuickUse = (minutes: number) => {
    setUseNowEnd(new Date(Date.now() + minutes * 60 * 1000));
    setUseNowError('');
  };

  const handleReserveSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!startDT || !endDT) return;
    setFormError('');
    if (checkOverlap(startDT, endDT)) {
      setFormError('選択した時間帯はすでに予約されているため使用できません。');
      return;
    }
    createMutation.mutate({
      device_id: deviceId,
      user_id: targetUserId,
      start_datetime: startDT.toISOString(),
      end_datetime: endDT.toISOString(),
      notes: notes || undefined,
    });
  };

  const upcomingReservations = device?.reservations?.filter(
    (r) => r.status === 'reserved' || r.status === 'in_use'
  ) ?? [];

  const isAvailable = !device?.current_reservation;
  const activeUsers = users?.filter((u) => u.is_active) ?? [];
  const currentReservation = device?.current_reservation;
  const canReturn = currentReservation &&
    (currentReservation.user_id === user?.id || isAdmin);

  useEffect(() => {
    if (currentReservation && !adjustEndDT) {
      setAdjustEndDT(new Date(currentReservation.end_datetime));
    }
  }, [currentReservation?.end_datetime]);

  return (
    <div
      aria-modal="true"
      role="dialog"
      className={[
        'fixed inset-0 z-50 flex items-center justify-center px-4',
        'transition-opacity duration-[220ms] ease-out',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div
        className={[
          'relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col',
          'transition-all duration-[220ms] ease-out',
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">端末詳細・予約</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 max-h-[75vh]">
          {isLoading ? (
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ) : device ? (
            <>
              {/* 端末情報 */}
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base">{device.name}</h3>
                  <p className="text-sm text-gray-500">{device.model}</p>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {DEVICE_TYPE_LABEL[device.type] ?? device.type}
                  </span>
                  {device.description && (
                    <p className="mt-2 text-sm text-gray-600">{device.description}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    device.current_reservation ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${device.current_reservation ? 'bg-red-500' : 'bg-green-500'}`} />
                  {device.current_reservation ? '使用中' : '空き'}
                </span>
              </div>

              {/* 代理予約：ユーザー選択（admin/system のみ） */}
              {isAdmin && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-2">代理予約：使用者を選択</p>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  >
                    <option value="">自分（{user?.name}）</option>
                    {activeUsers
                      .filter((u) => u.id !== user?.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {/* 今すぐ使用する */}
              {isAvailable && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-blue-800">今すぐ使用する</h4>

                  {useNowError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                      {useNowError}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-blue-600 mb-2">使用時間を選択</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {QUICK_DURATIONS.map(({ label, minutes }) => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => handleQuickUse(minutes)}
                          disabled={createMutation.isPending}
                          className="rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-blue-600 mb-2">または終了時刻を指定</p>
                    <div className="flex gap-2">
                      <DatePicker
                        selected={useNowEnd ?? new Date()}
                        onChange={(date: Date | null) => setUseNowEnd(date)}
                        showTimeSelect
                        timeIntervals={1}
                        timeFormat="HH:mm"
                        dateFormat="yyyy/MM/dd HH:mm"
                        locale="ja"
                        minDate={new Date()}
                        filterTime={(time) => time > new Date()}
                        placeholderText="日時を選択"
                        customInput={
                          <PlaceholderDateInput
                            hasValue={useNowEnd !== null}
                            className={datepickerClass('border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white')}
                          />
                        }
                        wrapperClassName="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleUseNow(useNowEnd)}
                        disabled={createMutation.isPending || !useNowEnd}
                        className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {createMutation.isPending ? '処理中...' : '使用する'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 予約スケジュール */}
              {isPlaceholderData && (
                <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              )}
              {!isPlaceholderData && upcomingReservations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">予約スケジュール</h4>
                  <ul className="space-y-2">
                    {upcomingReservations.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-medium text-gray-700">{r.user?.name ?? '不明'}</span>
                          <span className="ml-2 text-gray-500">
                            {formatDT(r.start_datetime)} 〜 {formatDT(r.end_datetime)}
                          </span>
                        </div>
                        {(r.user_id === user?.id || isAdmin) &&
                          r.status !== 'cancelled' &&
                          r.status !== 'completed' &&
                          r.status !== 'in_use' && (
                            <button
                              onClick={() => cancelMutation.mutate(r.id)}
                              disabled={cancelMutation.isPending}
                              className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0"
                            >
                              キャンセル
                            </button>
                          )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 使用時間の変更 */}
              {canReturn && currentReservation && (
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-orange-800">使用時間を変更する</h4>

                  {endTimeError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                      {endTimeError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <DatePicker
                      selected={adjustEndDT}
                      onChange={(date: Date | null) => setAdjustEndDT(date)}
                      showTimeSelect
                      timeIntervals={1}
                      timeFormat="HH:mm"
                      dateFormat="yyyy/MM/dd HH:mm"
                      locale="ja"
                      minDate={new Date()}
                      filterTime={(time) => time > new Date()}
                      placeholderText="日時を選択"
                      className={datepickerClass('border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-white')}
                      wrapperClassName="flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAdjustSubmit}
                      disabled={updateEndTimeMutation.isPending || !adjustEndDT}
                      className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      {updateEndTimeMutation.isPending ? '変更中...' : '変更'}
                    </button>
                  </div>
                </div>
              )}

              {/* 予約フォーム */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">予約する（日時指定）</h4>
                <form onSubmit={handleReserveSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">開始日時</label>
                      <DatePicker
                        selected={startDT ?? new Date()}
                        onChange={(date: Date | null) => setStartDT(date)}
                        showTimeSelect
                        timeIntervals={1}
                        timeFormat="HH:mm"
                        dateFormat="yyyy/MM/dd HH:mm"
                        locale="ja"
                        minDate={new Date()}
                        filterTime={filterStartTime}
                        placeholderText="日時を選択"
                        required
                        customInput={
                          <PlaceholderDateInput
                            hasValue={startDT !== null}
                            className={datepickerClass('border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100')}
                          />
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">終了日時</label>
                      <DatePicker
                        selected={endDT ?? startDT ?? new Date()}
                        onChange={(date: Date | null) => setEndDT(date)}
                        showTimeSelect
                        timeIntervals={1}
                        timeFormat="HH:mm"
                        dateFormat="yyyy/MM/dd HH:mm"
                        locale="ja"
                        minDate={startDT ?? new Date()}
                        maxDate={nextReservationAfterStart?.start ?? undefined}
                        filterTime={filterEndTime}
                        placeholderText="日時を選択"
                        required
                        customInput={
                          <PlaceholderDateInput
                            hasValue={endDT !== null}
                            className={datepickerClass('border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100')}
                          />
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                      placeholder="使用目的など"
                    />
                  </div>
                  <div className="flex gap-2">
                    {canReturn && (
                      <button
                        type="button"
                        onClick={() => completeMutation.mutate(currentReservation.id)}
                        disabled={completeMutation.isPending}
                        className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {completeMutation.isPending ? '返却中...' : '端末を返却する'}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={createMutation.isPending || !startDT || !endDT}
                      className="flex-1 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {createMutation.isPending ? '予約中...' : '予約する'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
