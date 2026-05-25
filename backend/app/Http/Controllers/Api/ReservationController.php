<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReservationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $authUser = $request->user();
        $isAdmin = in_array($authUser->role, ['admin', 'system'], true);

        $validated = $request->validate([
            'device_id'      => 'required|integer|exists:devices,id',
            'user_id'        => ['nullable', 'integer', 'exists:users,id', $isAdmin ? 'sometimes' : 'prohibited'],
            'start_datetime' => 'required|date',
            'end_datetime'   => 'required|date|after:start_datetime',
            'notes'          => 'nullable|string|max:1000',
        ]);

        $overlap = Reservation::where('device_id', $validated['device_id'])
            ->whereIn('status', ['reserved', 'in_use'])
            ->where('start_datetime', '<', $validated['end_datetime'])
            ->where('end_datetime', '>', $validated['start_datetime'])
            ->exists();

        if ($overlap) {
            return response()->json(['message' => 'この時間帯はすでに予約されています'], 422);
        }

        $targetUserId = $validated['user_id'] ?? $authUser->id;
        $startedAt = now()->parse($validated['start_datetime']);
        $status = $startedAt->lte(now()) ? 'in_use' : 'reserved';

        $reservation = DB::transaction(function () use ($validated, $authUser, $targetUserId, $status) {
            return Reservation::create([
                'device_id'      => $validated['device_id'],
                'user_id'        => $targetUserId,
                'created_by'     => $authUser->id,
                'start_datetime' => $validated['start_datetime'],
                'end_datetime'   => $validated['end_datetime'],
                'status'         => $status,
                'notes'          => $validated['notes'] ?? null,
            ]);
        });

        return response()->json(['data' => $reservation->load('user:id,name')], 201);
    }

    public function updateEndTime(Request $request, Reservation $reservation): JsonResponse
    {
        $user = $request->user();

        if ($reservation->user_id !== $user->id && !in_array($user->role, ['admin', 'system'], true)) {
            return response()->json(['message' => '権限がありません'], 403);
        }

        if (!in_array($reservation->status, ['reserved', 'in_use'], true)) {
            return response()->json(['message' => 'この予約は変更できません'], 422);
        }

        $validated = $request->validate([
            'end_datetime' => 'required|date|after:start_datetime|after:now',
        ]);

        $reservation->update(['end_datetime' => $validated['end_datetime']]);

        return response()->json(['data' => $reservation->fresh()->load('user:id,name')]);
    }

    public function cancel(Request $request, Reservation $reservation): JsonResponse
    {
        $user = $request->user();

        if ($reservation->user_id !== $user->id && !in_array($user->role, ['admin', 'system'], true)) {
            return response()->json(['message' => '権限がありません'], 403);
        }

        if (in_array($reservation->status, ['completed', 'cancelled'], true)) {
            return response()->json(['message' => 'この予約はキャンセルできません'], 422);
        }

        $reservation->update(['status' => 'cancelled']);

        return response()->json(['data' => $reservation]);
    }

    public function complete(Request $request, Reservation $reservation): JsonResponse
    {
        $user = $request->user();

        if ($reservation->user_id !== $user->id && !in_array($user->role, ['admin', 'system'], true)) {
            return response()->json(['message' => '権限がありません'], 403);
        }

        if (!in_array($reservation->status, ['reserved', 'in_use'], true)) {
            return response()->json(['message' => 'この予約は返却できません'], 422);
        }

        $reservation->update(['status' => 'completed']);

        return response()->json(['data' => $reservation]);
    }
}
