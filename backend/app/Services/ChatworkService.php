<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatworkService
{
    private string $apiToken;
    private string $roomId;
    private string $baseUrl = 'https://api.chatwork.com/v2';

    public function __construct()
    {
        $this->apiToken = config('services.chatwork.api_token', '');
        $this->roomId   = config('services.chatwork.room_id', '');
    }

    public function sendMessage(string $message): bool
    {
        if (empty($this->apiToken) || empty($this->roomId)) {
            Log::warning('ChatworkService: API token or room ID is not configured.');
            return false;
        }

        try {
            $response = Http::withHeaders([
                'X-ChatWorkToken' => $this->apiToken,
            ])->asForm()->post(
                "{$this->baseUrl}/rooms/{$this->roomId}/messages",
                ['body' => $message]
            );

            if ($response->failed()) {
                Log::error('ChatworkService: Failed to send message', [
                    'status'   => $response->status(),
                    'response' => $response->body(),
                ]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('ChatworkService: Exception when sending message', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function buildMention(string $accountId, string $name): string
    {
        return "[To:{$accountId}] {$name}\n";
    }
}
