export type ShopkeeperResource =
  | 'products'
  | 'stock'
  | 'purchases'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'returns'
  | 'reports';

export type EditableShopkeeperResource = Exclude<ShopkeeperResource, 'reports'>;

export type Option = {
  id: number;
  name: string;
  sku?: string;
  stock_quantity?: number;
  sale_price?: number;
  purchase_price?: number;
};

export type OptionsPayload = {
  categories: Option[];
  suppliers: Option[];
  customers: Option[];
  products: Option[];
};

export type Row = Record<string, unknown> & { id?: number };

export type FormState = Record<string, string>;

export type ReportPayload = {
  summary?: Record<string, number>;
  low_stock_products?: Row[];
  recent_sales?: Row[];
  recent_purchases?: Row[];
};

export type TableColumn = {
  key: string;
  label: string;
};
