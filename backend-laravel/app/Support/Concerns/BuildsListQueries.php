<?php

namespace App\Support\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait BuildsListQueries
{
    protected function applyListQuery(Builder $query, Request $request, array $searchColumns, array $sortableColumns = ['id', 'name', 'status', 'created_at']): void
    {
        $query->when($request->filled('search'), fn (Builder $query) => $this->applySearch($query, $request->string('search')->toString(), $searchColumns));
        $this->applyStatusFilter($query, $request);
        $query->orderBy(
            $this->safeSortColumn($request, $sortableColumns),
            $request->input('sort_dir') === 'asc' ? 'asc' : 'desc',
        );
    }

    protected function perPage(Request $request): int
    {
        return min(max($request->integer('per_page', 10), 1), 100);
    }

    private function applySearch(Builder $query, string $search, array $columns): void
    {
        if (mb_strlen(trim($search)) < 2) {
            return;
        }

        $query->where(function (Builder $query) use ($columns, $search): void {
            foreach ($columns as $column) {
                $query->orWhere($column, 'like', '%'.$search.'%');
            }
        });
    }

    private function applyStatusFilter(Builder $query, Request $request): void
    {
        if (! $request->filled('status')) {
            return;
        }

        $status = $request->string('status')->toString();

        if ($status === 'archived') {
            $query->onlyTrashed();

            return;
        }

        $query
            ->where('status', $status)
            ->whereNull($query->getModel()->getQualifiedDeletedAtColumn());
    }

    private function safeSortColumn(Request $request, array $sortableColumns): string
    {
        $sortBy = $request->input('sort_by', 'id');

        return in_array($sortBy, $sortableColumns, true) ? $sortBy : 'id';
    }
}
