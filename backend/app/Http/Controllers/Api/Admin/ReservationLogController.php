<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;

class ReservationLogController extends Controller
{
    public function index(): JsonResponse
    {
        $logs = Reservation::with(['device:id,name,model', 'user:id,name'])
            ->whereIn('status', ['completed', 'cancelled'])
            ->orderBy('end_datetime', 'desc')
            ->paginate(50);

        return response()->json($logs);
    }
}
