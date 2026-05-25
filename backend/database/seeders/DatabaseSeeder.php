<?php

namespace Database\Seeders;

use App\Models\Device;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'システム管理者',
            'email' => 'system@example.com',
            'password' => Hash::make('password'),
            'role' => 'system',
        ]);

        User::create([
            'name' => '管理者',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        User::create([
            'name' => '一般ユーザー',
            'email' => 'user@example.com',
            'password' => Hash::make('password'),
            'role' => 'user',
        ]);

        Device::create([
            'name' => 'iPhone 15 Pro',
            'model' => 'iPhone 15 Pro',
            'type' => 'phone',
            'description' => '検証用iPhone',
        ]);

        Device::create([
            'name' => 'iPad Air',
            'model' => 'iPad Air (第5世代)',
            'type' => 'tablet',
            'description' => '検証用iPad',
        ]);

        Device::create([
            'name' => 'Pixel 8',
            'model' => 'Google Pixel 8',
            'type' => 'phone',
            'description' => 'Android検証用',
        ]);
    }
}
