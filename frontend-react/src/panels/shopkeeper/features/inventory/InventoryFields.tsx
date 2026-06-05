import type { EditableShopkeeperResource, FormState, Option, OptionsPayload } from './inventoryTypes';

type FieldProps = {
  resource: EditableShopkeeperResource;
  form: FormState;
  options: OptionsPayload;
  errors: Record<string, string[]>;
  onChange: (field: string, value: string) => void;
};

export function InventoryFields({ resource, form, options, errors, onChange }: FieldProps) {
  if (resource === 'products') {
    return (
      <>
        <Text field="name" label="Product Name" form={form} errors={errors} onChange={onChange} />
        <div className="shop-form-row">
          <Text field="sku" label="SKU" form={form} errors={errors} onChange={onChange} />
          <Text field="barcode" label="Barcode" form={form} errors={errors} onChange={onChange} />
        </div>
        <div className="shop-form-row">
          <Select field="category_id" label="Category" form={form} errors={errors} options={options.categories} onChange={onChange} emptyLabel="New category below" />
          <Text field="category_name" label="New Category" form={form} errors={errors} onChange={onChange} />
        </div>
        <Select field="supplier_id" label="Supplier" form={form} errors={errors} options={options.suppliers} onChange={onChange} emptyLabel="No supplier" />
        <div className="shop-form-row">
          <Text field="purchase_price" label="Purchase Price" type="number" form={form} errors={errors} onChange={onChange} />
          <Text field="sale_price" label="Sale Price" type="number" form={form} errors={errors} onChange={onChange} />
        </div>
        <div className="shop-form-row">
          <Text field="stock_quantity" label="Opening Stock" type="number" form={form} errors={errors} onChange={onChange} />
          <Text field="reorder_level" label="Reorder Level" type="number" form={form} errors={errors} onChange={onChange} />
        </div>
        <div className="shop-form-row">
          <Text field="unit" label="Unit" form={form} errors={errors} onChange={onChange} />
          <Select field="status" label="Status" form={form} errors={errors} options={statusOptions} onChange={onChange} valueByName />
        </div>
      </>
    );
  }

  if (resource === 'stock') {
    return (
      <>
        <Select field="product_id" label="Product" form={form} errors={errors} options={options.products} onChange={onChange} />
        <div className="shop-form-row">
          <Select field="type" label="Movement" form={form} errors={errors} options={movementOptions} onChange={onChange} valueByName />
          <Text field="quantity" label="Quantity" type="number" form={form} errors={errors} onChange={onChange} />
        </div>
        <Text field="reference" label="Reference" form={form} errors={errors} onChange={onChange} />
        <Text field="note" label="Note" form={form} errors={errors} onChange={onChange} />
      </>
    );
  }

  if (resource === 'purchases' || resource === 'sales') {
    const party = resource === 'sales' ? 'customer_id' : 'supplier_id';
    const dateField = resource === 'sales' ? 'sale_date' : 'purchase_date';
    const statusField = resource === 'sales' ? 'payment_status' : 'status';
    const partyLabel = resource === 'sales' ? 'Customer' : 'Supplier';

    return (
      <>
        <Select field={party} label={partyLabel} form={form} errors={errors} options={resource === 'sales' ? options.customers : options.suppliers} onChange={onChange} emptyLabel={resource === 'sales' ? 'Walk-in' : 'No supplier'} />
        <Select field="product_id" label="Product" form={form} errors={errors} options={options.products} onChange={onChange} />
        <div className="shop-form-row">
          <Text field="invoice_no" label="Invoice No" form={form} errors={errors} onChange={onChange} />
          <Text field={dateField} label="Date" type="date" form={form} errors={errors} onChange={onChange} />
        </div>
        <div className="shop-form-row">
          <Text field="quantity" label="Quantity" type="number" form={form} errors={errors} onChange={onChange} />
          <Text field="unit_price" label="Unit Price" type="number" form={form} errors={errors} onChange={onChange} />
        </div>
        <div className="shop-form-row">
          <Text field="paid_amount" label="Paid" type="number" form={form} errors={errors} onChange={onChange} />
          <Select field={statusField} label={resource === 'sales' ? 'Payment' : 'Status'} form={form} errors={errors} options={resource === 'sales' ? paymentOptions : purchaseStatusOptions} onChange={onChange} valueByName />
        </div>
      </>
    );
  }

  if (resource === 'returns') {
    return (
      <>
        <Select field="product_id" label="Product" form={form} errors={errors} options={options.products} onChange={onChange} />
        <div className="shop-form-row">
          <Select field="type" label="Return Type" form={form} errors={errors} options={returnTypeOptions} onChange={onChange} valueByName />
          <Text field="quantity" label="Quantity" type="number" form={form} errors={errors} onChange={onChange} />
        </div>
        <div className="shop-form-row">
          <Text field="amount" label="Amount" type="number" form={form} errors={errors} onChange={onChange} />
          <Text field="return_date" label="Date" type="date" form={form} errors={errors} onChange={onChange} />
        </div>
      </>
    );
  }

  return (
    <>
      <Text field="name" label="Name" form={form} errors={errors} onChange={onChange} />
      <div className="shop-form-row">
        <Text field="phone" label="Phone" form={form} errors={errors} onChange={onChange} />
        <Text field="email" label="Email" type="email" form={form} errors={errors} onChange={onChange} />
      </div>
      {resource === 'customers' && <Text field="opening_balance" label="Opening Balance" type="number" form={form} errors={errors} onChange={onChange} />}
      <Text field="address" label="Address" form={form} errors={errors} onChange={onChange} />
      <Select field="status" label="Status" form={form} errors={errors} options={statusOptions} onChange={onChange} valueByName />
    </>
  );
}

function Text({ field, label, type = 'text', form, errors, onChange }: { field: string; label: string; type?: string; form: FormState; errors: Record<string, string[]>; onChange: (field: string, value: string) => void }) {
  return (
    <label className="shop-form-field">
      <span>{label}</span>
      <input className={`form-control ${errors[field] ? 'is-invalid' : ''}`} type={type} value={form[field] ?? ''} onChange={(event) => onChange(field, event.target.value)} step={type === 'number' ? '0.01' : undefined} />
      {errors[field] && <small>{errors[field][0]}</small>}
    </label>
  );
}

function Select({ field, label, form, errors, options, onChange, emptyLabel = 'Select', valueByName = false }: { field: string; label: string; form: FormState; errors: Record<string, string[]>; options: Option[]; onChange: (field: string, value: string) => void; emptyLabel?: string; valueByName?: boolean }) {
  return (
    <label className="shop-form-field">
      <span>{label}</span>
      <select className={`form-select ${errors[field] ? 'is-invalid' : ''}`} value={form[field] ?? ''} onChange={(event) => onChange(field, event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option value={valueByName ? option.name : option.id} key={`${field}-${option.id}-${option.name}`}>
            {option.name}{option.sku ? ` (${option.sku}, stock ${option.stock_quantity ?? 0})` : ''}
          </option>
        ))}
      </select>
      {errors[field] && <small>{errors[field][0]}</small>}
    </label>
  );
}

const statusOptions = [{ id: 0, name: 'active' }, { id: 1, name: 'inactive' }];
const movementOptions = [{ id: 0, name: 'in' }, { id: 1, name: 'out' }, { id: 2, name: 'adjustment' }];
const purchaseStatusOptions = [{ id: 0, name: 'received' }, { id: 1, name: 'ordered' }];
const paymentOptions = [{ id: 0, name: 'paid' }, { id: 1, name: 'partial' }, { id: 2, name: 'due' }];
const returnTypeOptions = [{ id: 0, name: 'customer' }, { id: 1, name: 'supplier' }];
