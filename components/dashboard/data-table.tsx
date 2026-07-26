"use client";

import { useEffect, useState } from "react";
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  pageSize?: number;
  /** Enables checkbox row selection + a bulk-actions bar rendered above the table. */
  enableRowSelection?: boolean;
  bulkActions?: (selectedRows: TData[], clearSelection: () => void) => React.ReactNode;
  toolbarEnd?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  /** Pre-fills the search box on first mount — used by deep-link entry points like
   *  `/super-admin/audit?entityId=…` from the Taxonomies workspace's "View history" action. */
  initialGlobalFilter?: string;
  /** Hides the built-in search box — for callers that already surface a richer, shared search
   *  control above the table (e.g. `ProjectRegistryView`'s `ProjectFiltersBar`) and would
   *  otherwise show two competing search inputs. Sorting/pagination/selection are unaffected. */
  hideSearch?: boolean;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  pageSize = 10,
  enableRowSelection = false,
  bulkActions,
  toolbarEnd,
  onRowClick,
  getRowId,
  initialGlobalFilter = "",
  hideSearch = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState(initialGlobalFilter);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });

  const selectionColumn: ColumnDef<TData, unknown> | null = enableRowSelection
    ? {
        id: "__select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[var(--color-zim-green)]"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[var(--color-zim-green)]"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 32,
      }
    : null;

  const table = useReactTable({
    data,
    columns: selectionColumn ? [selectionColumn, ...columns] : columns,
    state: { sorting, globalFilter, rowSelection, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection,
    // Pagination is fully controlled above (unlike tanstack's default uncontrolled mode) so we can
    // reset the page index ourselves in a useEffect below — leaving `autoResetPageIndex` on would
    // have tanstack call its internal setter mid-render whenever filtering shrinks the row count
    // below the current page, which React flags as "state update on a component that hasn't
    // mounted yet" the first time this table instance renders with an out-of-range page.
    autoResetPageIndex: false,
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const clearSelection = () => setRowSelection({});

  // Snap back to page 1 whenever the underlying dataset or the search filter changes the
  // available row count, so the page index can never point past the end (see autoResetPageIndex
  // note above — this replaces tanstack's built-in mid-render auto-reset with an effect).
  useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, [data, globalFilter]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {!hideSearch && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
              style={{ color: "var(--color-text-muted)" }}
            />
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="dashboard-input pl-8"
            />
          </div>
        )}
        {toolbarEnd}
        {enableRowSelection && selectedRows.length > 0 && bulkActions && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {selectedRows.length} selected
            </span>
            {bulkActions(selectedRows, clearSelection)}
          </div>
        )}
      </div>

      <div className="dashboard-panel overflow-x-auto">
        <table className="dashboard-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={cn(canSort && "cursor-pointer select-none")}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort &&
                            (sortDir === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : sortDir === "desc" ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40" />
                            ))}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {(selectionColumn ? [selectionColumn, ...columns] : columns).map((_, j) => (
                    <td key={j}>
                      <div className="dashboard-skeleton h-4 w-full max-w-[160px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={(selectionColumn ? [selectionColumn, ...columns] : columns).length}
                  className="text-center py-10"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ·{" "}
            {table.getFilteredRowModel().rows.length} rows
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded disabled:opacity-30 hover:bg-white/10 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded disabled:opacity-30 hover:bg-white/10 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
