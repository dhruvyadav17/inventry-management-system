import { money } from './inventoryUtils';
import type { FormState, Option, ShopkeeperResource } from './inventoryTypes';

export function InventoryFormSummary({ resource, form, product }: { resource: ShopkeeperResource; form: FormState; product?: Option }) {
  if (!['products', 'stock', 'purchases', 'sales', 'returns'].includes(resource)) {
    return null;
  }

  const quantity = Number(form.quantity || 0);
  const unitPrice = Number(form.unit_price || 0);
  const paid = Number(form.paid_amount || 0);
  const total = quantity * unitPrice;
  const due = Math.max(0, total - paid);

  if (resource === 'products') {
    const purchasePrice = Number(form.purchase_price || 0);
    const salePrice = Number(form.sale_price || 0);
    const margin = salePrice - purchasePrice;

    return (
      <div className="shop-form-summary">
        <span>Margin</span>
        <strong>{money(margin)}</strong>
        <small>Per {form.unit || 'unit'}</small>
      </div>
    );
  }

  if (resource === 'stock' || resource === 'returns') {
    return (
      <div className="shop-form-summary">
        <span>Current Stock</span>
        <strong>{product?.stock_quantity ?? 0}</strong>
        <small>{product?.name ?? 'Select a product'}</small>
      </div>
    );
  }

  return (
    <div className="shop-form-summary">
      <span>{resource === 'sales' ? 'Bill Total' : 'Purchase Total'}</span>
      <strong>{money(total)}</strong>
      <small>Due {money(due)} | Stock {product?.stock_quantity ?? 0}</small>
    </div>
  );
}
