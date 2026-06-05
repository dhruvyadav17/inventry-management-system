import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api, apiGet, apiPage, getApiErrorMessage, getValidationErrors, toRows } from '@common/services/api';
import { editableResources, emptyOptions, initialForms, resourceEndpoints, resourceTitles } from './inventory/inventoryConfig';
import { fromRow, normalizePayload } from './inventory/inventoryUtils';
import { InventoryFields } from './inventory/InventoryFields';
import { InventoryFormSummary } from './inventory/InventoryFormSummary';
import { InventoryReportsView } from './inventory/InventoryReportsView';
import { InventoryRowsTable } from './inventory/InventoryRowsTable';
import type { EditableShopkeeperResource, FormState, OptionsPayload, ReportPayload, Row, ShopkeeperResource } from './inventory/inventoryTypes';
import { shopkeeperApi } from '../shopkeeperConfig';

export type { ShopkeeperResource } from './inventory/inventoryTypes';

export function ShopkeeperInventoryPage({ resource }: { resource: ShopkeeperResource }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [report, setReport] = useState<ReportPayload>({});
  const [options, setOptions] = useState<OptionsPayload>(emptyOptions);
  const [form, setForm] = useState<FormState>(() => freshForm(resource));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const canWrite = resource !== 'reports';
  const filteredProducts = useMemo(() => options.products.filter((product) => product.name), [options.products]);
  const selectedProduct = filteredProducts.find((product) => String(product.id) === form.product_id);

  useEffect(() => {
    resetForm(resource);
  }, [resource]);

  useEffect(() => {
    loadOptions();
    loadRows();
  }, [resource]);

  function loadOptions() {
    apiGet<OptionsPayload>(shopkeeperApi.options)
      .then(setOptions)
      .catch(() => setOptions(emptyOptions));
  }

  function loadRows(activeSearch = search) {
    setLoading(true);

    if (resource === 'reports') {
      apiGet<ReportPayload>(resourceEndpoints.reports)
        .then((payload) => {
          setReport(payload);
          setRows([]);
        })
        .catch((error) => setMessage(getApiErrorMessage(error)))
        .finally(() => setLoading(false));
      return;
    }

    apiPage<Row>(resourceEndpoints[resource], { search: activeSearch, per_page: 25 })
      .then((payload) => setRows(toRows(payload)))
      .catch((error) => setMessage(getApiErrorMessage(error)))
      .finally(() => setLoading(false));
  }

  function updateField(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));

    if (field === 'product_id' && ['purchases', 'sales'].includes(resource)) {
      const product = filteredProducts.find((item) => String(item.id) === value);
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
        await api.put(`${resourceEndpoints[resource]}/${editingId}`, normalizePayload(resource, form));
        setMessage('Record updated.');
      } else {
        await api.post(resourceEndpoints[resource], normalizePayload(resource, form));
        setMessage('Record saved.');
      }

      resetForm(resource);
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

  function resetForm(activeResource: ShopkeeperResource) {
    setEditingId(null);
    setErrors({});
    setMessage('');
    setForm(freshForm(activeResource));
  }

  async function archive(row: Row) {
    if (!editableResources.has(resource) || typeof row.id !== 'number') {
      return;
    }

    try {
      await api.delete(`${resourceEndpoints[resource]}/${row.id}`);
      setMessage('Record archived.');
      loadOptions();
      loadRows();
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    }
  }

  return (
    <div className="shop-inventory-page">
      <section className="shop-page-title">
        <div>
          <h1>{resourceTitles[resource]}</h1>
          <span>{resource === 'reports' ? 'Sales, purchase and stock summary' : 'Create records and review current inventory data'}</span>
        </div>
        {resource !== 'reports' && (
          <button className="shop-title-action" type="button" onClick={() => resetForm(resource)}>
            <i className="bi bi-plus-lg" /> New
          </button>
        )}
      </section>

      {message && <div className="shop-alert mb-3"><i className="bi bi-info-circle" /><span>{message}</span></div>}

      {resource === 'reports' ? (
        <InventoryReportsView report={report} loading={loading} />
      ) : (
        <div className="shop-work-grid">
          <section className="shop-panel">
            <div className="shop-panel-head">
              <h2>{editingId ? `Edit ${resourceTitles[resource]}` : `Add ${resourceTitles[resource]}`}</h2>
              {editingId && <button className="shop-panel-menu" type="button" onClick={() => resetForm(resource)}>Cancel</button>}
            </div>
            <form className="shop-form" onSubmit={save}>
              <InventoryFields resource={resource} form={form} options={{ ...options, products: filteredProducts }} errors={errors} onChange={updateField} />
              <InventoryFormSummary resource={resource} form={form} product={selectedProduct} />
              <button className="shop-action-btn primary w-100" type="submit" disabled={saving}>
                <i className="bi bi-check2" /> {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
              </button>
            </form>
          </section>

          <section className="shop-panel">
            <div className="shop-panel-head">
              <h2>{resourceTitles[resource]} List</h2>
              <form className="shop-search-form" onSubmit={(event) => { event.preventDefault(); loadRows(search); }}>
                <input className="form-control" value={search} placeholder="Search" onChange={(event) => setSearch(event.target.value)} />
                <button className="shop-action-btn" type="submit"><i className="bi bi-search" /></button>
                {search && <button className="shop-action-btn" type="button" onClick={() => { setSearch(''); loadRows(''); }}><i className="bi bi-x-lg" /></button>}
              </form>
            </div>
            <InventoryRowsTable resource={resource} rows={rows} loading={loading} onEdit={edit} onArchive={archive} />
          </section>
        </div>
      )}
    </div>
  );
}

function freshForm(resource: ShopkeeperResource): FormState {
  return { ...(initialForms[resource as EditableShopkeeperResource] ?? {}) };
}
