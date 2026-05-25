<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceDetailController extends Controller
{
    public function show(Device $device): JsonResponse
    {
        if (!$device->is_active) {
            return response()->json(['message' => '端末が見つかりません'], 404);
        }

        $device->load([
            'currentReservation.user:id,name',
            'reservations' => function ($q) {
                $q->whereIn('status', ['reserved', 'in_use'])
                    ->where('end_datetime', '>=', now())
                    ->orderBy('start_datetime')
                    ->with('user:id,name');
            },
        ]);

        return response()->json(['data' => $device]);
    }
}
