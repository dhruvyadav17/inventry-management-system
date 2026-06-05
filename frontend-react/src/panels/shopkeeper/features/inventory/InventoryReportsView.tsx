import { exportReportPayload } from './inventoryCsv';
import { money } from './inventoryUtils';
import { InventoryRowsTable } from './InventoryRowsTable';
import type { ReportPayload } from './inventoryTypes';

export function InventoryReportsView({ report, loading }: { report: ReportPayload; loading: boolean }) {
  const summary = report.summary ?? {};
  const hasReportData = Object.keys(summary).length > 0
    || Boolean(report.low_stock_products?.length)
    || Boolean(report.recent_sales?.length)
    || Boolean(report.recent_purchases?.length);
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
      <section className="shop-report-toolbar">
        <button
          data-testid="shop-reports-export"
          className="shop-action-btn"
          type="button"
          disabled={!hasReportData}
          onClick={() => exportReportPayload(report)}
        >
          <i className="bi bi-download" /> Export
        </button>
      </section>
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
          <InventoryRowsTable resource="products" rows={report.low_stock_products ?? []} loading={false} onEdit={() => undefined} onArchive={() => undefined} />
        </section>
        <section className="shop-panel">
          <div className="shop-panel-head"><h2>Recent Sales</h2></div>
          <InventoryRowsTable resource="sales" rows={report.recent_sales ?? []} loading={false} onEdit={() => undefined} onArchive={() => undefined} />
        </section>
      </div>
      <section className="shop-panel shop-full-panel">
        <div className="shop-panel-head"><h2>Recent Purchases</h2></div>
        <InventoryRowsTable resource="purchases" rows={report.recent_purchases ?? []} loading={false} onEdit={() => undefined} onArchive={() => undefined} />
      </section>
    </>
  );
}
