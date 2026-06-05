import type { EditableShopkeeperResource, FormState, ShopkeeperResource, TableColumn } from './inventoryTypes';
import { shopkeeperApi } from '../../shopkeeperConfig';

const today = new Date().toISOString().slice(0, 10);

export const emptyOptions = { categories: [], suppliers: [], customers: [], products: [] };

export const initialForms: Record<EditableShopkeeperResource, FormState> = {
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

export const resourceTitles: Record<ShopkeeperResource, string> = {
  products: 'Products',
  stock: 'Stock Movement',
  purchases: 'Purchases',
  sales: 'Sales Billing',
  customers: 'Customers',
  suppliers: 'Suppliers',
  returns: 'Returns',
  reports: 'Reports',
};

export const resourceEndpoints: Record<ShopkeeperResource, string> = {
  products: shopkeeperApi.resources.products,
  stock: shopkeeperApi.resources.stock,
  purchases: shopkeeperApi.resources.purchases,
  sales: shopkeeperApi.resources.sales,
  customers: shopkeeperApi.resources.customers,
  suppliers: shopkeeperApi.resources.suppliers,
  returns: shopkeeperApi.resources.returns,
  reports: shopkeeperApi.resources.reports,
};

export const editableResources = new Set<ShopkeeperResource>(['products', 'customers', 'suppliers']);

export const tableColumns: Record<ShopkeeperResource, TableColumn[]> = {
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
};
