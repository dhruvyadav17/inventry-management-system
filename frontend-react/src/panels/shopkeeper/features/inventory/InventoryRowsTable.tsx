import { editableResources, tableColumns } from './inventoryConfig';
import { formatValue } from './inventoryUtils';
import type { Row, ShopkeeperResource } from './inventoryTypes';

export function InventoryRowsTable({ resource, rows, loading, onEdit, onArchive }: { resource: ShopkeeperResource; rows: Row[]; loading: boolean; onEdit: (row: Row) => void; onArchive: (row: Row) => void }) {
  const columns = tableColumns[resource];
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
