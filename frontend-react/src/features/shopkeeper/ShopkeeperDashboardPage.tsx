import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAppSelector } from '../../app/hooks';
import { apiGet } from '../../services/api';

type ShopkeeperDashboard = {
  shop?: { id: number; name: string; code: string; status: string } | null;
  stats?: Record<string, number>;
  products?: Array<{ id: number; name: string; sku: string; category: string; stock: number; reorder_level: number; sale_price: number; status: string }>;
  alerts?: string[];
  modules?: Array<{ name: string; icon: string; path: string }>;
};

const quickActions = [
  { name: 'Add Product', icon: 'bi-plus-square', path: '/shopkeeper/products' },
  { name: 'Stock In', icon: 'bi-box-arrow-in-down', path: '/shopkeeper/stock' },
  { name: 'Create Bill', icon: 'bi-receipt-cutoff', path: '/shopkeeper/sales' },
  { name: 'Purchase Entry', icon: 'bi-bag-plus', path: '/shopkeeper/purchases' },
];

const chartMonths = [
  { month: 'Jan', sales: 52, purchase: 22 },
  { month: 'Feb', sales: 45, purchase: 54 },
  { month: 'Mar', sales: 59, purchase: 48 },
  { month: 'Apr', sales: 70, purchase: 34 },
  { month: 'May', sales: 50, purchase: 23 },
  { month: 'Jun', sales: 44, purchase: 55 },
  { month: 'Jul', sales: 60, purchase: 47 },
  { month: 'Aug', sales: 71, purchase: 35 },
];

export function ShopkeeperDashboardPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [data, setData] = useState<ShopkeeperDashboard>({});
  const primaryShop = user?.shops?.find((shop) => shop.is_primary) ?? user?.shops?.[0];
  const shop = data.shop ?? primaryShop;
  const stats = data.stats ?? {};
  const products = data.products ?? [];
  const alerts = data.alerts ?? [];
  const modules = data.modules ?? quickActions;
  const summaryCards = [
    { label: 'Total Purchase Due', value: money(stats.pending_payments ?? 0, true), icon: 'bi-bag-check', tone: 'orange' },
    { label: 'Total Sales Due', value: money(stats.pending_payments ?? 0, true), icon: 'bi-cash-coin', tone: 'green' },
    { label: 'Total Sale Amount', value: money(stats.today_sales ?? 0, true), icon: 'bi-arrow-down-short', tone: 'cyan' },
    { label: 'Monthly Expense', value: money(stats.monthly_expenses ?? 0, true), icon: 'bi-arrow-up-short', tone: 'rose' },
  ];
  const colorCards = [
    { label: 'Customers', value: stats.customers ?? 0, icon: 'bi-person', tone: 'orange' },
    { label: 'Suppliers', value: stats.suppliers ?? 0, icon: 'bi-person-check', tone: 'cyan' },
    { label: 'Purchase Invoice', value: products.length + 95, icon: 'bi-file-earmark-text', tone: 'navy' },
    { label: 'Sales Invoice', value: products.length + 99, icon: 'bi-file-earmark', tone: 'green' },
  ];
  const expiredRows = products.slice(0, 4);

  useEffect(() => {
    apiGet<ShopkeeperDashboard>('/shopkeeper/dashboard')
      .then(setData)
      .catch(() => setData({}));
  }, []);

  return (
    <div className="shopkeeper-dashboard">
      <section className="shop-page-title">
        <div>
          <h1>Dashboard</h1>
          <span>{shop?.name ?? 'Shop workspace'} / {shop?.code ?? 'No shop selected'}</span>
        </div>
        <Link className="shop-title-action" to="/shopkeeper/sales"><i className="bi bi-plus-lg" /> New Sale</Link>
      </section>

      <section className="shop-summary-grid">
        {summaryCards.map((item) => (
          <div className="shop-summary-card" key={item.label}>
            <span className={`shop-summary-icon ${item.tone}`}><i className={`bi ${item.icon}`} /></span>
            <div>
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </div>
          </div>
        ))}
      </section>

      <section className="shop-color-grid">
        {colorCards.map((item) => (
          <div className={`shop-color-card ${item.tone}`} key={item.label}>
            <div>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
            <i className={`bi ${item.icon}`} />
          </div>
        ))}
      </section>

      <section className="shop-action-grid">
        {modules.slice(0, 8).map((item) => (
          <Link className="shop-quick-action" to={item.path} key={item.name}>
            <i className={`bi ${item.icon}`} />
            <span>{item.name}</span>
          </Link>
        ))}
      </section>

      <div className="shop-dashboard-grid">
        <section className="shop-panel">
          <div className="shop-panel-head">
            <h2>Purchase & Sales</h2>
            <div className="shop-chart-legend">
              <span><i className="sales" /> Sales</span>
              <span><i className="purchase" /> Purchase</span>
              <select aria-label="Chart year">
                <option>2026</option>
                <option>2025</option>
              </select>
            </div>
          </div>
          <div className="shop-chart">
            {chartMonths.map((item) => (
              <div className="shop-chart-month" key={item.month}>
                <div className="shop-bars">
                  <span className="sale-bar" style={{ height: `${item.sales}%` }}>{item.sales}</span>
                  <span className="purchase-bar" style={{ height: `${item.purchase}%` }} />
                </div>
                <small>{item.month}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="shop-panel">
          <div className="shop-panel-head">
            <h2>Recently Added Products</h2>
            <button className="shop-panel-menu" aria-label="More options"><i className="bi bi-three-dots-vertical" /></button>
          </div>
          <div className="shop-table-wrap">
            <table className="shop-mini-table">
              <thead>
                <tr>
                  <th>Sno</th>
                  <th>Products</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 5).map((product, index) => (
                  <tr key={product.sku}>
                    <td>{index + 1}</td>
                    <td>
                      <span className="shop-product-thumb"><i className="bi bi-box-seam" /></span>
                      {product.name}
                    </td>
                    <td>{money(product.sale_price, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && <div className="shop-alert">No products found for this shop.</div>}
          </div>
        </section>
      </div>

      <section className="shop-panel shop-full-panel">
        <div className="shop-panel-head">
          <h2>Inventory Status</h2>
          <Link to="/shopkeeper/products">View products</Link>
        </div>
        <div className="shop-table-wrap">
          <table className="shop-mini-table shop-wide-table">
            <thead>
              <tr>
                <th>SNo</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Category Name</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {expiredRows.map((product, index) => (
                <tr key={product.sku}>
                  <td>{index + 1}</td>
                  <td>{product.sku}</td>
                  <td>
                    <span className="shop-product-dot" />
                    {product.name}
                  </td>
                  <td>{product.category}</td>
                  <td>{product.stock}</td>
                  <td><span className={`shop-stock ${product.stock <= 0 ? 'danger' : product.stock <= product.reorder_level ? 'warning' : ''}`}>{product.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="shop-alert-strip">
        {alerts.map((alert) => (
          <div className="shop-alert" key={alert}>
            <i className="bi bi-bell" />
            <span>{alert}</span>
          </div>
        ))}
        {alerts.length === 0 && <div className="shop-alert">No urgent inventory alerts.</div>}
      </section>
    </div>
  );
}

function money(value: number, currency = false) {
  if (currency) {
    return `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }

  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
}
