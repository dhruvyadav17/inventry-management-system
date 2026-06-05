<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('status')->default('active')->index();
            $table->softDeletes();
            $table->timestamps();
            $table->unique(['shop_id', 'name']);
            $table->index(['shop_id', 'deleted_at', 'name'], 'categories_shop_deleted_name_idx');
        });

        Schema::create('suppliers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('status')->default('active')->index();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['shop_id', 'deleted_at', 'name'], 'suppliers_shop_deleted_name_idx');
            $table->index(['shop_id', 'deleted_at', 'phone'], 'suppliers_shop_deleted_phone_idx');
        });

        Schema::create('customers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->decimal('opening_balance', 12, 2)->default(0);
            $table->string('status')->default('active')->index();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['shop_id', 'deleted_at', 'name'], 'customers_shop_deleted_name_idx');
            $table->index(['shop_id', 'deleted_at', 'phone'], 'customers_shop_deleted_phone_idx');
        });

        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('sku');
            $table->string('barcode')->nullable();
            $table->decimal('purchase_price', 12, 2)->default(0);
            $table->decimal('sale_price', 12, 2)->default(0);
            $table->integer('stock_quantity')->default(0);
            $table->integer('reorder_level')->default(5);
            $table->string('unit')->default('pcs');
            $table->string('status')->default('active')->index();
            $table->softDeletes();
            $table->timestamps();
            $table->unique(['shop_id', 'sku']);
            $table->index(['shop_id', 'stock_quantity']);
            $table->index(['shop_id', 'deleted_at', 'name'], 'products_shop_deleted_name_idx');
            $table->index(['shop_id', 'deleted_at', 'reorder_level'], 'products_shop_deleted_reorder_idx');
        });

        Schema::create('stock_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->integer('quantity');
            $table->string('reference')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('moved_at')->useCurrent();
            $table->timestamps();
            $table->index(['shop_id', 'type']);
            $table->index(['shop_id', 'id'], 'stock_movements_shop_id_idx');
            $table->index(['shop_id', 'moved_at'], 'stock_movements_shop_moved_idx');
            $table->index(['product_id', 'id'], 'stock_movements_product_id_idx');
        });

        Schema::create('purchases', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice_no')->nullable();
            $table->date('purchase_date');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->string('status')->default('received')->index();
            $table->timestamps();
            $table->index(['shop_id', 'id'], 'purchases_shop_id_idx');
            $table->index(['shop_id', 'purchase_date'], 'purchases_shop_date_idx');
            $table->index(['shop_id', 'invoice_no'], 'purchases_shop_invoice_idx');
        });

        Schema::create('purchase_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->integer('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('total_price', 12, 2);
            $table->timestamps();
            $table->index(['purchase_id', 'product_id'], 'purchase_items_purchase_product_idx');
            $table->index(['shop_id', 'product_id'], 'purchase_items_shop_product_idx');
        });

        Schema::create('sales', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice_no')->unique();
            $table->date('sale_date');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->string('payment_status')->default('paid')->index();
            $table->timestamps();
            $table->index(['shop_id', 'id'], 'sales_shop_id_idx');
            $table->index(['shop_id', 'sale_date'], 'sales_shop_date_idx');
            $table->index(['shop_id', 'invoice_no'], 'sales_shop_invoice_idx');
        });

        Schema::create('sale_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->integer('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('total_price', 12, 2);
            $table->timestamps();
            $table->index(['sale_id', 'product_id'], 'sale_items_sale_product_idx');
            $table->index(['shop_id', 'product_id'], 'sale_items_shop_product_idx');
        });

        Schema::create('expenses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->decimal('amount', 12, 2);
            $table->date('expense_date');
            $table->timestamps();
            $table->index(['shop_id', 'expense_date'], 'expenses_shop_date_idx');
        });

        Schema::create('payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('party_type');
            $table->unsignedBigInteger('party_id')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('method')->default('cash');
            $table->string('status')->default('paid')->index();
            $table->date('payment_date');
            $table->timestamps();
            $table->index(['shop_id', 'payment_date'], 'payments_shop_date_idx');
            $table->index(['shop_id', 'party_type', 'party_id'], 'payments_shop_party_idx');
        });

        Schema::create('returns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->integer('quantity');
            $table->decimal('amount', 12, 2)->default(0);
            $table->date('return_date');
            $table->timestamps();
            $table->index(['shop_id', 'id'], 'returns_shop_id_idx');
            $table->index(['shop_id', 'return_date'], 'returns_shop_date_idx');
            $table->index(['shop_id', 'type'], 'returns_shop_type_idx');
        });

        Schema::create('invoices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice_no')->unique();
            $table->string('status')->default('issued')->index();
            $table->date('invoice_date');
            $table->timestamps();
            $table->index(['shop_id', 'invoice_date'], 'invoices_shop_date_idx');
            $table->index(['shop_id', 'status'], 'invoices_shop_status_idx');
        });
    }

    public function down(): void
    {
        foreach (['invoices', 'returns', 'payments', 'expenses', 'sale_items', 'sales', 'purchase_items', 'purchases', 'stock_movements', 'products', 'customers', 'suppliers', 'categories'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
