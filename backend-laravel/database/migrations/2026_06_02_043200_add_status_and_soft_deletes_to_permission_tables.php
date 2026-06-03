<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->enum('status', ['active', 'inactive'])->default('active')->after('guard_name');
            $table->softDeletes();
        });

        Schema::table('permissions', function (Blueprint $table): void {
            $table->enum('status', ['active', 'inactive'])->default('active')->after('guard_name');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->dropSoftDeletes();
            $table->dropColumn('status');
        });

        Schema::table('permissions', function (Blueprint $table): void {
            $table->dropSoftDeletes();
            $table->dropColumn('status');
        });
    }
};
