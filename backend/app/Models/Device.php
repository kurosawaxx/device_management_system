<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Device extends Model
{
    protected $fillable = [
        'name',
        'model',
        'type',
        'image_path',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function currentReservation(): HasOne
    {
        return $this->hasOne(Reservation::class)
            ->where('start_datetime', '<=', now())
            ->where('end_datetime', '>=', now())
            ->whereIn('status', ['reserved', 'in_use']);
    }

    public function upcomingReservation(): HasOne
    {
        return $this->hasOne(Reservation::class)
            ->where('start_datetime', '>', now())
            ->whereIn('status', ['reserved'])
            ->orderBy('start_datetime');
    }
}
