import { resourceTitles, tableColumns } from './inventoryConfig';
import { formatValue } from './inventoryUtils';
import type { ReportPayload, Row, ShopkeeperResource, TableColumn } from './inventoryTypes';

type CsvRow = Array<string | number | null | undefined>;

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows: CsvRow[]) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function downloadCsv(filename: string, rows: CsvRow[]) {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function tableRows(title: string, columns: TableColumn[], rows: Row[]): CsvRow[] {
  return [
    [title],
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => formatValue(row[column.key], column.key))),
  ];
}

export function exportResourceRows(resource: Exclude<ShopkeeperResource, 'reports'>, rows: Row[]) {
  const columns = tableColumns[resource];
  downloadCsv(`${resource}-export.csv`, tableRows(resourceTitles[resource], columns, rows));
}

export function exportReportPayload(report: ReportPayload) {
  const summary = report.summary ?? {};
  const sections: CsvRow[] = [
    ['Report Summary'],
    ['Metric', 'Value'],
    ...Object.entries(summary).map(([key, value]) => [key.replaceAll('_', ' '), value]),
    [],
    ...tableRows('Low Stock Products', tableColumns.products, report.low_stock_products ?? []),
    [],
    ...tableRows('Recent Sales', tableColumns.sales, report.recent_sales ?? []),
    [],
    ...tableRows('Recent Purchases', tableColumns.purchases, report.recent_purchases ?? []),
  ];

  downloadCsv('shopkeeper-report-export.csv', sections);
}
