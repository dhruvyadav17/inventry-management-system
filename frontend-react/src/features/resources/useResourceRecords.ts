import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiPage, toRows, type LaravelPage } from '../../services/api';
import type { ResourceName, ResourceRecord } from '../../types';
import { getResourceConfig } from './resourceConfig';

export function useResourceRecords(resource: ResourceName) {
  const [rows, setRows] = useState<ResourceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState<LaravelPage<ResourceRecord>['meta']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const config = getResourceConfig(resource);
  const title = config.title;
  const endpoint = useMemo(() => `/${resource}`, [resource]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = { page, per_page: perPage, search: filters.search, sort_by: sortBy, sort_dir: sortDir, status: filters.status };
      const data = await apiPage<ResourceRecord>(endpoint, params);
      setRows(toRows(data));
      setPagination(data.meta);
    } catch {
      setRows([]);
      setPagination(undefined);
      setError(`Unable to load ${title.toLowerCase()} from API.`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, filters, page, perPage, sortBy, sortDir, title]);

  useEffect(() => {
    load();
  }, [load, resource]);

  useEffect(() => {
    const nextFilters = { search: normalizedSearch(search), status };
    if (nextFilters.search === filters.search && nextFilters.status === filters.status) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFilters(nextFilters);
      setPage(1);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [filters, search, status]);

  function applyFilters() {
    setFilters({ search: normalizedSearch(search), status });
    setPage(1);
  }

  function sort(column: string) {
    setPage(1);
    if (sortBy === column) {
      setSortDir((value) => (value === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(column);
    setSortDir('asc');
  }

  function changePerPage(value: number) {
    setPage(1);
    setPerPage(value);
  }

  return {
    endpoint,
    error,
    applyFilters,
    load,
    loading,
    page,
    pagination,
    perPage,
    rows,
    search,
    setPage,
    setPerPage: changePerPage,
    setSearch,
    setStatus,
    sort,
    sortBy,
    sortDir,
    status,
    title,
    config,
  };
}

function normalizedSearch(search: string) {
  const value = search.trim();

  return value.length >= 2 ? value : '';
}
