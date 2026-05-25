<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservation_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // 'start' or 'end'
            $table->unsignedTinyInteger('minutes_before');
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->unique(['reservation_id', 'type', 'minutes_before'], 'resv_notif_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservation_notifications');
    }
};
