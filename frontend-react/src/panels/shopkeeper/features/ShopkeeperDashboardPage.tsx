import { Link } from 'react-router-dom';
import { useAppSelector } from '@app/hooks';
import { useApiQuery } from '@common/hooks/useApiQuery';
import { shopkeeperApi, shopkeeperPaths, shopkeeperQuickActions } from '../shopkeeperConfig';

type ShopkeeperDashboard = {
  shop?: { id: number; name: string; code: string; status: string } | null;
  stats?: Record<string, number>;
  products?: Array<{ id: number; name: string; sku: string; category: string; stock: number; reorder_level: number; sale_price: number; status: string }>;
  low_stock_products?: Array<{ id: number; name: string; sku: string; category: string; stock: number; reorder_level: number; sale_price: number; status: string }>;
  chart?: Array<{ month: string; sales: number; purchase: number }>;
  alerts?: string[];
  modules?: Array<{ name: string; icon: string; path: string }>;
};

export function ShopkeeperDashboardPage() {
  const user = useAppSelector((state) => state.auth.user);
  const { data } = useApiQuery<ShopkeeperDashboard>(shopkeeperApi.dashboard, {});
  const primaryShop = user?.shops?.find((shop) => shop.is_primary) ?? user?.shops?.[0];
  const shop = data.shop ?? primaryShop;
  const stats = data.stats ?? {};
  const products = data.products ?? [];
  const lowStockProducts = data.low_stock_products ?? [];
  const alerts = data.alerts ?? [];
  const modules = data.modules ?? shopkeeperQuickActions;
  const chartMonths = data.chart ?? [];
  const maxChartValue = Math.max(1, ...chartMonths.flatMap((item) => [item.sales, item.purchase]));
  const summaryCards = [
    { label: 'Purchase Due', value: money(stats.purchase_due ?? 0, true), icon: 'bi-bag-check', tone: 'orange' },
    { label: 'Sales Due', value: money(stats.sales_due ?? 0, true), icon: 'bi-cash-coin', tone: 'green' },
    { label: "Today's Sales", value: money(stats.today_sales ?? 0, true), icon: 'bi-arrow-down-short', tone: 'cyan' },
    { label: 'Stock Value', value: money(stats.stock_value ?? 0, true), icon: 'bi-boxes', tone: 'rose' },
  ];
  const colorCards = [
    { label: 'Customers', value: stats.customers ?? 0, icon: 'bi-person', tone: 'orange' },
    { label: 'Suppliers', value: stats.suppliers ?? 0, icon: 'bi-person-check', tone: 'cyan' },
    { label: 'Purchase Invoice', value: stats.purchase_invoice_count ?? 0, icon: 'bi-file-earmark-text', tone: 'navy' },
    { label: 'Sales Invoice', value: stats.sales_invoice_count ?? 0, icon: 'bi-file-earmark', tone: 'green' },
  ];

  return (
    <div className="shopkeeper-dashboard">
      <section className="shop-page-title">
        <div>
          <h1>Dashboard</h1>
          <span>{shop?.name ?? 'Shop workspace'} / {shop?.code ?? 'No shop selected'}</span>
        </div>
        <Link className="shop-title-action" to={shopkeeperPaths.sales}><i className="bi bi-plus-lg" /> New Sale</Link>
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
            </div>
          </div>
          <div className="shop-chart">
            {chartMonths.map((item) => (
              <div className="shop-chart-month" key={item.month}>
                <div className="shop-bars">
                  <span className="sale-bar" title={`Sales ${money(item.sales, true)}`} style={{ height: `${Math.max(8, (item.sales / maxChartValue) * 100)}%` }} />
                  <span className="purchase-bar" title={`Purchase ${money(item.purchase, true)}`} style={{ height: `${Math.max(8, (item.purchase / maxChartValue) * 100)}%` }} />
                </div>
                <small>{item.month}</small>
              </div>
            ))}
            {chartMonths.length === 0 && <div className="shop-alert">No monthly sales or purchase data yet.</div>}
          </div>
        </section>

        <section className="shop-panel">
          <div className="shop-panel-head">
            <h2>Recently Added Products</h2>
            <Link to={shopkeeperPaths.products}>Manage</Link>
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
          <h2>Low Stock Status</h2>
          <Link to={shopkeeperPaths.products}>View products</Link>
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
              {lowStockProducts.map((product, index) => (
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
          {lowStockProducts.length === 0 && <div className="shop-alert m-3">No low-stock products right now.</div>}
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
    return `Rs ${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
}
