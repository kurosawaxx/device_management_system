<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::select('id', 'name', 'email', 'role', 'is_active', 'chatwork_account_id', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:100',
            'email'               => 'required|email|unique:users,email',
            'password'            => 'required|string|min:8',
            'role'                => ['required', Rule::in(['system', 'admin', 'user'])],
            'chatwork_account_id' => 'nullable|string|max:50',
        ]);

        $user = User::create([
            'name'                => $validated['name'],
            'email'               => $validated['email'],
            'password'            => Hash::make($validated['password']),
            'role'                => $validated['role'],
            'is_active'           => true,
            'chatwork_account_id' => $validated['chatwork_account_id'] ?? null,
        ]);

        return response()->json([
            'data' => $user->only('id', 'name', 'email', 'role', 'is_active', 'chatwork_account_id', 'created_at'),
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $isSystem = $request->user()->role === 'system';

        $validated = $request->validate([
            'name'                => 'sometimes|string|max:100',
            'email'               => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'password'            => 'sometimes|string|min:8',
            'role'                => ['sometimes', $isSystem ? Rule::in(['system', 'admin', 'user']) : 'prohibited'],
            'is_active'           => 'sometimes|boolean',
            'chatwork_account_id' => 'sometimes|nullable|string|max:50',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'data' => $user->fresh()->only('id', 'name', 'email', 'role', 'is_active', 'chatwork_account_id', 'created_at'),
        ]);
    }

    public function destroy(User $user, Request $request): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => '自分自身は削除できません'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'ユーザーを削除しました']);
    }
}
