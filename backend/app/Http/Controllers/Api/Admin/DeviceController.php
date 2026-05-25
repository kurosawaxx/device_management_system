<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DeviceController extends Controller
{
    public function index(): JsonResponse
    {
        $devices = Device::orderBy('created_at', 'desc')->get();

        return response()->json(['data' => $devices]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:100',
            'model'       => 'required|string|max:100',
            'type'        => ['required', Rule::in(['phone', 'tablet', 'other'])],
            'description' => 'nullable|string',
            'is_active'   => 'sometimes|boolean',
            'image'       => 'nullable|image|max:5120',
        ]);

        if ($request->hasFile('image')) {
            $validated['image_path'] = $request->file('image')->store('devices', 'public');
        }
        unset($validated['image']);

        $device = Device::create($validated);

        return response()->json(['data' => $device], 201);
    }

    public function update(Request $request, Device $device): JsonResponse
    {
        $isAdmin = $request->user()->role === 'admin';

        if ($isAdmin) {
            $validated = $request->validate([
                'name'  => 'sometimes|string|max:100',
                'model' => 'sometimes|string|max:100',
                'image' => 'nullable|image|max:5120',
            ]);
        } else {
            $validated = $request->validate([
                'name'        => 'sometimes|string|max:100',
                'model'       => 'sometimes|string|max:100',
                'type'        => ['sometimes', Rule::in(['phone', 'tablet', 'other'])],
                'description' => 'nullable|string',
                'is_active'   => 'sometimes|boolean',
                'image'       => 'nullable|image|max:5120',
            ]);
        }

        if ($request->hasFile('image')) {
            if ($device->image_path) {
                Storage::disk('public')->delete($device->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('devices', 'public');
        }
        unset($validated['image']);

        $device->update($validated);

        return response()->json(['data' => $device->fresh()]);
    }

    public function destroy(Device $device): JsonResponse
    {
        if ($device->image_path) {
            Storage::disk('public')->delete($device->image_path);
        }

        $device->forceDelete();

        return response()->json(['message' => '端末を削除しました']);
    }
}
