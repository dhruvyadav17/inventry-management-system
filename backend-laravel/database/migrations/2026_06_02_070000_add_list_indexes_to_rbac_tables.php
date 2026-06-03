<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->index(['status', 'deleted_at']);
            $table->index('name');
        });

        Schema::table('roles', function (Blueprint $table): void {
            $table->index(['status', 'deleted_at']);
            $table->index('name');
        });

        Schema::table('permissions', function (Blueprint $table): void {
            $table->index(['status', 'deleted_at']);
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['status', 'deleted_at']);
            $table->dropIndex(['name']);
        });

        Schema::table('roles', function (Blueprint $table): void {
            $table->dropIndex(['status', 'deleted_at']);
            $table->dropIndex(['name']);
        });

        Schema::table('permissions', function (Blueprint $table): void {
            $table->dropIndex(['status', 'deleted_at']);
            $table->dropIndex(['name']);
        });
    }
};
