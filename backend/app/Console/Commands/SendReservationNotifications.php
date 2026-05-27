<?php

namespace App\Console\Commands;

use App\Models\Reservation;
use App\Models\User;
use App\Services\ChatworkService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SendReservationNotifications extends Command
{
    protected $signature   = 'notifications:send-reservation-reminders';
    protected $description = '予約開始・終了前にチャットワーク通知を送信する';

    // 通知タイミング（分前）をここに追加するだけで増やせる
    private array $startReminders = [5, 1];
    private array $endReminders   = [5, 0];

    public function __construct(private readonly ChatworkService $chatwork)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $now = Carbon::now();

        $this->autoStartReserved($now);
        $this->autoCompleteExpired($now);

        foreach ($this->startReminders as $minutes) {
            $this->sendNotifications('start', $minutes, $now);
        }
        foreach ($this->endReminders as $minutes) {
            $this->sendNotifications('end', $minutes, $now);
        }

        return self::SUCCESS;
    }

    private function autoStartReserved(Carbon $now): void
    {
        $count = Reservation::where('status', 'reserved')
            ->where('start_datetime', '<=', $now)
            ->update(['status' => 'in_use']);

        if ($count > 0) {
            $this->info("予約を使用中に更新: {$count}件");
        }
    }

    private function autoCompleteExpired(Carbon $now): void
    {
        $count = Reservation::whereIn('status', ['in_use', 'reserved'])
            ->where('end_datetime', '<', $now)
            ->update(['status' => 'completed']);

        if ($count > 0) {
            $this->info("期限切れ予約を自動完了: {$count}件");
        }
    }

    private function sendNotifications(string $type, int $minutesBefore, Carbon $now): void
    {
        $field       = $type === 'start' ? 'start_datetime' : 'end_datetime';
        $windowStart = $now->copy()->addMinutes($minutesBefore);
        $windowEnd   = $now->copy()->addMinutes($minutesBefore + 1);
        $statuses    = $type === 'start' ? ['reserved', 'in_use'] : ['in_use'];

        $with = ['user', 'device'];
        if ($type === 'start') {
            $with[] = 'device.currentReservation.user';
        }
        if ($type === 'end' && $minutesBefore === 0) {
            $with[] = 'device.upcomingReservation.user';
        }

        $reservations = Reservation::with($with)
            ->whereIn('status', $statuses)
            ->whereBetween($field, [$windowStart, $windowEnd])
            ->whereDoesntHave('notifications', function ($q) use ($type, $minutesBefore) {
                $q->where('type', $type)->where('minutes_before', $minutesBefore);
            })
            ->get();

        foreach ($reservations as $reservation) {
            $user   = $reservation->user;
            $device = $reservation->device;

            if (!$user || !$device) {
                continue;
            }

            $message = '';
            if ($user->chatwork_account_id) {
                $message .= $this->chatwork->buildMention($user->chatwork_account_id, $user->name);
            }
            $currentUser  = null;
            $nextUser     = null;
            if ($type === 'start' && $minutesBefore === 1) {
                $current = $device->currentReservation;
                if ($current && $current->user_id !== $reservation->user_id) {
                    $currentUser = $current->user;
                }
            }
            if ($type === 'end' && $minutesBefore === 0) {
                $nextUser = $device->upcomingReservation?->user;
            }
            $message .= $this->buildMessage($type, $minutesBefore, $device->name, $currentUser, $nextUser);

            $sent = $this->chatwork->sendMessage($message);

            if ($sent) {
                $reservation->notifications()->create([
                    'type'           => $type,
                    'minutes_before' => $minutesBefore,
                    'sent_at'        => now(),
                ]);
                $this->info("通知送信完了: 予約#{$reservation->id} ({$type} {$minutesBefore}分前)");
            } else {
                $this->warn("通知送信失敗: 予約#{$reservation->id} ({$type} {$minutesBefore}分前)");
            }
        }
    }

    private function buildMessage(string $type, int $minutesBefore, string $deviceName, ?User $currentUser = null, ?User $nextUser = null): string
    {
        if ($type === 'start') {
            $msg = "【予約開始のお知らせ】\n端末「{$deviceName}」の予約開始まであと{$minutesBefore}分です。";
            if ($currentUser) {
                $msg .= "\n現在は{$currentUser->name}さんが使用中です。直接受け取りに行ってください。";
            }
            return $msg;
        }

        if ($minutesBefore === 0) {
            if ($nextUser) {
                return "【貸出時間終了のお知らせ】\n端末貸出時間が終了しました。{$nextUser->name}さんに使用していた端末を渡してください。";
            }
            return "【貸出時間終了のお知らせ】\n端末貸出時間が終了しました。端末を返却してください。";
        }

        return "【使用期限のお知らせ】\n端末「{$deviceName}」の使用期限が{$minutesBefore}分後に終了します。";
    }
}
