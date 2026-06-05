import { initialForms } from './inventoryConfig';
import type { FormState, Row, ShopkeeperResource } from './inventoryTypes';

const nullableFields = ['supplier_id', 'customer_id', 'category_id', 'barcode', 'reference', 'note', 'email', 'phone', 'address', 'invoice_no'];
const integerFields = ['product_id', 'supplier_id', 'customer_id', 'category_id', 'quantity', 'stock_quantity', 'reorder_level'];
const moneyFields = ['purchase_price', 'sale_price', 'unit_price', 'paid_amount', 'opening_balance', 'amount'];

export function normalizePayload(resource: ShopkeeperResource, form: FormState) {
  const payload: Record<string, string | number | null> = {};

  Object.entries(form).forEach(([key, value]) => {
    if (value === '' && nullableFields.includes(key)) {
      payload[key] = null;
      return;
    }

    if (integerFields.includes(key)) {
      payload[key] = value === '' ? null : Number(value);
      return;
    }

    if (moneyFields.includes(key)) {
      payload[key] = value === '' ? 0 : Number(value);
      return;
    }

    payload[key] = value;
  });

  if (resource === 'products' && payload.category_id) {
    payload.category_name = null;
  }

  return payload;
}

export function fromRow(resource: ShopkeeperResource, row: Row): FormState {
  const base = { ...(initialForms[resource as Exclude<ShopkeeperResource, 'reports'>] ?? {}) };

  Object.keys(base).forEach((key) => {
    const value = row[key];
    base[key] = value === null || value === undefined ? '' : String(value);
  });

  return base;
}

export function formatValue(value: unknown, key: string) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (['sale_price', 'purchase_price', 'unit_price', 'total_amount', 'paid_amount', 'opening_balance', 'amount'].includes(key)) {
    return money(Number(value));
  }

  return String(value);
}

export function money(value: number) {
  return `Rs ${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
