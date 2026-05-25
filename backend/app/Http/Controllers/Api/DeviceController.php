<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\JsonResponse;

class DeviceController extends Controller
{
    public function index(): JsonResponse
    {
        $devices = Device::where('is_active', true)
            ->with([
                'currentReservation.user:id,name',
                'upcomingReservation.user:id,name',
            ])
            ->get();

        return response()->json(['data' => $devices]);
    }
}
