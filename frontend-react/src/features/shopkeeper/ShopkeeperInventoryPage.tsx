import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api, apiGet, apiPage, getApiErrorMessage, getValidationErrors, toRows } from '../../services/api';

export type ShopkeeperResource =
  | 'products'
  | 'stock'
  | 'purchases'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'returns'
  | 'reports';

type Option = {
  id: number;
  name: string;
  sku?: string;
  stock_quantity?: number;
  sale_price?: number;
  purchase_price?: number;
};

type OptionsPayload = {
  categories: Option[];
  suppliers: Option[];
  customers: Option[];
  products: Option[];
};

type Row = Record<string, unknown> & { id?: number };

type FormState = Record<string, string>;

type ReportPayload = {
  summary?: Record<string, number>;
  low_stock_products?: Row[];
  recent_sales?: Row[];
  recent_purchases?: Row[];
};

const today = new Date().toISOString().slice(0, 10);

const initialForms: Record<Exclude<ShopkeeperResource, 'reports'>, FormState> = {
  products: {
    name: '',
    sku: '',
    barcode: '',
    category_id: '',
    category_name: '',
    supplier_id: '',
    purchase_price: '0',
    sale_price: '0',
    stock_quantity: '0',
    reorder_level: '5',
    unit: 'pcs',
    status: 'active',
  },
  stock: {
    product_id: '',
    type: 'in',
    quantity: '1',
    reference: '',
    note: '',
  },
  purchases: {
    supplier_id: '',
    product_id: '',
    invoice_no: '',
    purchase_date: today,
    quantity: '1',
    unit_price: '0',
    paid_amount: '0',
    status: 'received',
  },
  sales: {
    customer_id: '',
    product_id: '',
    invoice_no: '',
    sale_date: today,
    quantity: '1',
    unit_price: '0',
    paid_amount: '0',
    payment_status: 'paid',
  },
  customers: {
    name: '',
    phone: '',
    email: '',
    address: '',
    opening_balance: '0',
    status: 'active',
  },
  suppliers: {
    name: '',
    phone: '',
    email: '',
    address: '',
    status: 'active',
  },
  returns: {
    product_id: '',
    type: 'customer',
    quantity: '1',
    amount: '0',
    return_date: today,
  },
};

const titles: Record<ShopkeeperResource, string> = {
  products: 'Products',
  stock: 'Stock Movement',
  purchases: 'Purchases',
  sales: 'Sales Billing',
  customers: 'Customers',
  suppliers: 'Suppliers',
  returns: 'Returns',
  reports: 'Reports',
};

const endpoint: Record<ShopkeeperResource, string> = {
  products: '/shopkeeper/products',
  stock: '/shopkeeper/stock',
  purchases: '/shopkeeper/purchases',
  sales: '/shopkeeper/sales',
  customers: '/shopkeeper/customers',
  suppliers: '/shopkeeper/suppliers',
  returns: '/shopkeeper/returns',
  reports: '/shopkeeper/reports',
};

const editableResources = new Set<ShopkeeperResource>(['products', 'customers', 'suppliers']);

export function ShopkeeperInventoryPage({ resource }: { resource: ShopkeeperResource }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [report, setReport] = useState<ReportPayload>({});
  const [options, setOptions] = useState<OptionsPayload>({ categories: [], suppliers: [], customers: [], products: [] });
  const [form, setForm] = useState<FormState>(() => ({ ...(initialForms[resource as Exclude<ShopkeeperResource, 'reports'>] ?? {}) }));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const canWrite = resource !== 'reports';

  useEffect(() => {
    setForm({ ...(initialForms[resource as Exclude<ShopkeeperResource, 'reports'>] ?? {}) });
    setEditingId(null);
    setMessage('');
    setErrors({});
  }, [resource]);

  useEffect(() => {
    loadOptions();
    loadRows();
  }, [resource]);

  const filteredProducts = useMemo(() => options.products.filter((product) => product.name), [options.products]);

  function loadOptions() {
    apiGet<OptionsPayload>('/shopkeeper/options')
      .then(setOptions)
      .catch(() => setOptions({ categories: [], suppliers: [], customers: [], products: [] }));
  }

  function loadRows(activeSearch = search) {
    setLoading(true);
    if (resource === 'reports') {
      apiGet<ReportPayload>(endpoint.reports)
        .then((payload) => {
          setReport(payload);
          setRows([]);
        })
        .catch((error) => setMessage(getApiErrorMessage(error)))
        .finally(() => setLoading(false));
      return;
    }

    apiPage<Row>(endpoint[resource], { search: activeSearch, per_page: 25 })
      .then((payload) => setRows(toRows(payload)))
      .catch((error) => setMessage(getApiErrorMessage(error)))
      .finally(() => setLoading(false));
  }

  function updateField(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));

    if (field === 'product_id' && ['purchases', 'sales'].includes(resource)) {
      const product = options.products.find((item) => String(item.id) === value);
      if (product) {
        setForm((current) => ({
          ...current,
          product_id: value,
          unit_price: String(resource === 'sales' ? product.sale_price ?? 0 : product.purchase_price ?? 0),
        }));
      }
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      return;
    }

    setSaving(true);
    setErrors({});
    setMessage('');

    try {
      if (editingId) {
        await api.put(`${endpoint[resource]}/${editingId}`, normalizePayload(resource, form));
        setMessage('Record updated.');
      } else {
        await api.post(endpoint[resource], normalizePayload(resource, form));
        setMessage('Record saved.');
      }

      setForm({ ...(initialForms[resource as Exclude<ShopkeeperResource, 'reports'>] ?? {}) });
      setEditingId(null);
      loadOptions();
      loadRows();
    } catch (error) {
      setErrors(getValidationErrors(error) ?? {});
      setMessage(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function edit(row: Row) {
    if (!editableResources.has(resource) || typeof row.id !== 'number') {
      return;
    }

    setEditingId(row.id);
    setErrors({});
    setForm(fromRow(resource, row));
  }

  async function archive(row: Row) {
    if (!editableResources.has(resource) || typeof row.id !== 'number') {
      return;
    }

    await api.delete(`${endpoint[resource]}/${row.id}`);
    setMessage('Record archived.');
    loadOptions();
    loadRows();
  }

  return (
    <div className="shop-inventory-page">
      <section className="shop-page-title">
        <div>
          <h1>{titles[resource]}</h1>
          <span>{resource === 'reports' ? 'Sales, purchase and stock summary' : 'Create records and review current inventory data'}</span>
        </div>
        {resource !== 'reports' && (
          <button className="shop-title-action" type="button" onClick={() => setForm({ ...(initialForms[resource] ?? {}) })}>
            <i className="bi bi-plus-lg" /> New
          </button>
        )}
      </section>

      {message && <div className="shop-alert mb-3"><i className="bi bi-info-circle" /><span>{message}</span></div>}

      {resource === 'reports' ? (
        <ReportsView report={report} loading={loading} />
      ) : (
        <div className="shop-work-grid">
          <section className="shop-panel">
            <div className="shop-panel-head">
              <h2>{editingId ? `Edit ${titles[resource]}` : `Add ${titles[resource]}`}</h2>
              {editingId && <button className="shop-panel-menu" type="button" onClick={() => { setEditingId(null); setForm({ ...(initialForms[resource] ?? {}) }); }}>Cancel</button>}
            </div>
            <form className="shop-form" onSubmit={save}>
              <Fields resource={resource} form={form} options={{ ...options, products: filteredProducts }} errors={errors} onChange={updateField} />
              <button className="shop-action-btn primary w-100" type="submit" disabled={saving}>
                <i className="bi bi-check2" /> {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
              </button>
            </form>
          </section>

          <section className="shop-panel">
            <div className="shop-panel-head">
              <h2>{titles[resource]} List</h2>
              <form className="shop-search-form" onSubmit={(event) => { event.preventDefault(); loadRows(search); }}>
                <input className="form-control" value={search} placeholder="Search" onChange={(event) => setSearch(event.target.value)} />
                <button className="shop-action-btn" type="submit"><i className="bi bi-search" /></button>
              </form>
            </div>
            <RowsTable resource={resource} rows={rows} loading={loading} onEdit={edit} onArchive={archive} />
          </section>
        </div>
      )}
    </div>
  );
}

function Fields({ resource, form, options, errors, onChange }: { resource: Exclude<ShopkeeperResource, 'reports'>; form: FormState; options: OptionsPayload; errors: Record<string, string[]>; onChange: (field: string, value: string) => void }) {
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
          <Select field="status" label="Status" form={form} errors={errors} options={[{ id: 0, name: 'active' }, { id: 1, name: 'inactive' }]} onChange={onChange} valueByName />
        </div>
      </>
    );
  }

  if (resource === 'stock') {
    return (
      <>
        <Select field="product_id" label="Product" form={form} errors={errors} options={options.products} onChange={onChange} />
        <div className="shop-form-row">
          <Select field="type" label="Movement" form={form} errors={errors} options={[{ id: 0, name: 'in' }, { id: 1, name: 'out' }, { id: 2, name: 'adjustment' }]} onChange={onChange} valueByName />
          <Text field="quantity" label="Quantity" type="number" form={form} errors={errors} onChange={onChange} />
        </div>
        <Text field="reference" label="Reference" form={form} errors={errors} onChange={onChange} />
        <Text field="note" label="Note" form={form} errors={errors} onChange={onChange} />
      </>
    );
  }

  if (resource === 'purchases') {
    return (
      <>
        <Select field="supplier_id" label="Supplier" form={form} errors={errors} options={options.suppliers} onChange={onChange} emptyLabel="No supplier" />
        <Select field="product_id" label="Product" form={form} errors={errors} options={options.products} onChange={onChange} />
        <div className="shop-form-row">
          <Text field="invoice_no" label="Invoice No" form={form} errors={errors} onChange={onChange} />
          <Text field="purchase_date" label="Date" type="date" form={form} errors={errors} onChange={onChange} />
        </div>
        <div className="shop-form-row">
          <Text field="quantity" label="Quantity" type="number" form={form} errors={errors} onChange={onChange} />
          <Text field="unit_price" label="Unit Price" type="number" form={form} errors={errors} onChange={onChange} />
        </div>
        <div className="shop-form-row">
          <Text field="paid_amount" label="Paid" type="number" form={form} errors={errors} onChange={onChange} />
          <Select field="status" label="Status" form={form} errors={errors} options={[{ id: 0, name: 'received' }, { id: 1, name: 'ordered' }]} onChange={onChange} valueByName />
        </div>
      </>
    );
  }

  if (resource === 'sales') {
    return (
      <>
        <Select field="customer_id" label="Customer" form={form} errors={errors} options={options.customers} onChange={onChange} emptyLabel="Walk-in" />
        <Select field="product_id" label="Product" form={form} errors={errors} options={options.products} onChange={onChange} />
        <div className="shop-form-row">
          <Text field="invoice_no" label="Invoice No" form={form} errors={errors} onChange={onChange} />
          <Text field="sale_date" label="Date" type="date" form={form} errors={errors} onChange={onChange} />
        </div>
        <div className="shop-form-row">
          <Text field="quantity" label="Quantity" type="number" form={form} errors={errors} onChange={onChange} />
          <Text field="unit_price" label="Unit Price" type="number" form={form} errors={errors} onChange={onChange} />
        </div>
        <div className="shop-form-row">
          <Text field="paid_amount" label="Paid" type="number" form={form} errors={errors} onChange={onChange} />
          <Select field="payment_status" label="Payment" form={form} errors={errors} options={[{ id: 0, name: 'paid' }, { id: 1, name: 'partial' }, { id: 2, name: 'due' }]} onChange={onChange} valueByName />
        </div>
      </>
    );
  }

  if (resource === 'returns') {
    return (
      <>
        <Select field="product_id" label="Product" form={form} errors={errors} options={options.products} onChange={onChange} />
        <div className="shop-form-row">
          <Select field="type" label="Return Type" form={form} errors={errors} options={[{ id: 0, name: 'customer' }, { id: 1, name: 'supplier' }]} onChange={onChange} valueByName />
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
      <Select field="status" label="Status" form={form} errors={errors} options={[{ id: 0, name: 'active' }, { id: 1, name: 'inactive' }]} onChange={onChange} valueByName />
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

function RowsTable({ resource, rows, loading, onEdit, onArchive }: { resource: ShopkeeperResource; rows: Row[]; loading: boolean; onEdit: (row: Row) => void; onArchive: (row: Row) => void }) {
  const columns = columnsFor(resource);
  const showActions = editableResources.has(resource);

  return (
    <div className="shop-table-wrap">
      <table className="shop-mini-table shop-wide-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key}>{column.label}</th>)}
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${resource}-${row.id}`}>
              {columns.map((column) => <td key={column.key}>{formatValue(row[column.key], column.key)}</td>)}
              {showActions && (
                <td>
                  <div className="shop-row-actions">
                    <button className="shop-icon-action" type="button" onClick={() => onEdit(row)}><i className="bi bi-pencil" /></button>
                    <button className="shop-icon-action danger" type="button" onClick={() => onArchive(row)}><i className="bi bi-archive" /></button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <div className="shop-alert m-3">Loading records...</div>}
      {!loading && rows.length === 0 && <div className="shop-alert m-3">No records found.</div>}
    </div>
  );
}

function ReportsView({ report, loading }: { report: ReportPayload; loading: boolean }) {
  const summary = report.summary ?? {};
  const cards = [
    ['Total Sales', summary.total_sales],
    ['Total Purchases', summary.total_purchases],
    ['Expenses', summary.expenses],
    ['Gross Profit', summary.gross_profit],
    ['Stock Value', summary.stock_value],
    ['Low Stock', summary.low_stock],
  ];

  if (loading) {
    return <div className="shop-alert">Loading report...</div>;
  }

  return (
    <>
      <section className="shop-summary-grid">
        {cards.map(([label, value]) => (
          <div className="shop-summary-card" key={label}>
            <span className="shop-summary-icon green"><i className="bi bi-bar-chart" /></span>
            <div>
              <strong>{typeof value === 'number' && label !== 'Low Stock' ? money(value) : value ?? 0}</strong>
              <small>{label}</small>
            </div>
          </div>
        ))}
      </section>
      <div className="shop-dashboard-grid">
        <section className="shop-panel">
          <div className="shop-panel-head"><h2>Low Stock Products</h2></div>
          <RowsTable resource="products" rows={report.low_stock_products ?? []} loading={false} onEdit={() => undefined} onArchive={() => undefined} />
        </section>
        <section className="shop-panel">
          <div className="shop-panel-head"><h2>Recent Sales</h2></div>
          <RowsTable resource="sales" rows={report.recent_sales ?? []} loading={false} onEdit={() => undefined} onArchive={() => undefined} />
        </section>
      </div>
    </>
  );
}

function columnsFor(resource: ShopkeeperResource) {
  return {
    products: [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Product' },
      { key: 'category', label: 'Category' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'stock_quantity', label: 'Stock' },
      { key: 'sale_price', label: 'Sale Price' },
      { key: 'status', label: 'Status' },
    ],
    stock: [
      { key: 'product', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'type', label: 'Type' },
      { key: 'quantity', label: 'Qty' },
      { key: 'reference', label: 'Reference' },
      { key: 'moved_at', label: 'Date' },
    ],
    purchases: [
      { key: 'invoice_no', label: 'Invoice' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'product', label: 'Product' },
      { key: 'quantity', label: 'Qty' },
      { key: 'total_amount', label: 'Total' },
      { key: 'paid_amount', label: 'Paid' },
      { key: 'status', label: 'Status' },
    ],
    sales: [
      { key: 'invoice_no', label: 'Invoice' },
      { key: 'customer', label: 'Customer' },
      { key: 'product', label: 'Product' },
      { key: 'quantity', label: 'Qty' },
      { key: 'total_amount', label: 'Total' },
      { key: 'paid_amount', label: 'Paid' },
      { key: 'payment_status', label: 'Payment' },
    ],
    customers: [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'opening_balance', label: 'Opening' },
      { key: 'status', label: 'Status' },
    ],
    suppliers: [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status' },
    ],
    returns: [
      { key: 'product', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'type', label: 'Type' },
      { key: 'quantity', label: 'Qty' },
      { key: 'amount', label: 'Amount' },
      { key: 'return_date', label: 'Date' },
    ],
    reports: [],
  }[resource];
}

function normalizePayload(resource: ShopkeeperResource, form: FormState) {
  const payload: Record<string, string | number | null> = {};

  Object.entries(form).forEach(([key, value]) => {
    if (value === '' && ['supplier_id', 'customer_id', 'category_id', 'barcode', 'reference', 'note', 'email', 'phone', 'address', 'invoice_no'].includes(key)) {
      payload[key] = null;
      return;
    }

    if (['product_id', 'supplier_id', 'customer_id', 'category_id', 'quantity', 'stock_quantity', 'reorder_level'].includes(key)) {
      payload[key] = value === '' ? null : Number(value);
      return;
    }

    if (['purchase_price', 'sale_price', 'unit_price', 'paid_amount', 'opening_balance', 'amount'].includes(key)) {
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

function fromRow(resource: ShopkeeperResource, row: Row): FormState {
  const base = { ...(initialForms[resource as Exclude<ShopkeeperResource, 'reports'>] ?? {}) };
  Object.keys(base).forEach((key) => {
    const value = row[key];
    base[key] = value === null || value === undefined ? '' : String(value);
  });

  return base;
}

function formatValue(value: unknown, key: string) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (['sale_price', 'purchase_price', 'unit_price', 'total_amount', 'paid_amount', 'opening_balance', 'amount'].includes(key)) {
    return money(Number(value));
  }

  return String(value);
}

function money(value: number) {
  return `Rs ${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
