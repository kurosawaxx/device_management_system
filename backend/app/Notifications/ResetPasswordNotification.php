<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    public function __construct(private string $token) {}

    public function via(): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = config('app.frontend_url') . '/reset-password?token=' . $this->token . '&email=' . urlencode($notifiable->email);

        return (new MailMessage)
            ->subject('【社内端末管理システム】パスワードリセット')
            ->greeting($notifiable->name . ' さん')
            ->line('パスワードリセットのリクエストを受け付けました。')
            ->action('パスワードをリセットする', $url)
            ->line('このリンクは60分間有効です。')
            ->line('心当たりがない場合は、このメールを無視してください。')
            ->salutation('社内端末管理システム');
    }
}
