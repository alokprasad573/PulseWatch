'use client';

import React, { useMemo } from 'react';
import { MonitorCheckDto, MonitorChecksSort, PaginationMeta } from '@pulsewatch/shared';
import {
  Activity,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface CheckHistoryTableProps {
  checks: MonitorCheckDto[];
  meta: PaginationMeta | null | undefined;
  page: number;
  limit: number;
  sort: MonitorChecksSort;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  error: Error | null;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSortChange: (sort: MonitorChecksSort) => void;
}

type PageItem = { type: 'page'; value: number } | { type: 'ellipsis'; key: string };

function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => ({
      type: 'page',
      value: idx + 1,
    }));
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage - 1 >= 2) pages.add(currentPage - 1);
  if (currentPage + 1 <= totalPages - 1) pages.add(currentPage + 1);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 3);
    pages.add(totalPages - 2);
    pages.add(totalPages - 1);
  }

  const sorted = Array.from(pages)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const num = sorted[i];
    if (i > 0 && num - sorted[i - 1] > 1) {
      items.push({ type: 'ellipsis', key: `ellipsis-${sorted[i - 1]}-${num}` });
    }
    items.push({ type: 'page', value: num });
  }
  return items;
}

/**
 * Paginated, sortable audit ledger of endpoint probe executions.
 */
export function CheckHistoryTable({
  checks,
  meta,
  page,
  limit,
  sort,
  isLoading,
  isFetching,
  isPlaceholderData,
  error,
  onPageChange,
  onLimitChange,
  onSortChange,
}: CheckHistoryTableProps) {
  const total = meta?.total ?? checks.length;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startItem = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(currentPage * limit, total);

  const pageItems = useMemo(
    () => buildPageItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  return (
    <section
      aria-labelledby="check-history-heading"
      className="bg-[#1B1C1E] border border-[#30302E] rounded-lg overflow-hidden"
    >
      {/* Header & Filter Toolbar */}
      <div className="p-5 border-b border-[#30302E] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2
            id="check-history-heading"
            className="text-base font-semibold text-[#F4F1EA] flex items-center gap-2"
          >
            <Activity className="w-4 h-4 text-[#D6BD91]" aria-hidden="true" />
            <span>Detailed Check History</span>
          </h2>
          <span className="text-xs font-mono tabular-nums text-[#A5A29B] px-2 py-0.5 rounded bg-[#101112] border border-[#30302E]">
            {total.toLocaleString()} {total === 1 ? 'check' : 'checks'}
          </span>
          {isFetching && !isLoading && (
            <span
              aria-live="polite"
              className="text-[11px] text-[#D6BD91] inline-flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6BD91] motion-safe:animate-pulse" />
              Updating
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Newest / Oldest Sort Filter */}
          <div
            role="group"
            aria-label="Sort check history"
            className="inline-flex items-center bg-[#101112] border border-[#30302E] p-1 rounded-lg"
          >
            <button
              type="button"
              onClick={() => onSortChange('newest')}
              aria-pressed={sort === 'newest'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91] ${
                sort === 'newest'
                  ? 'bg-[#222326] text-[#D6BD91] border border-[#D6BD91]/40'
                  : 'text-[#A5A29B] hover:text-[#F4F1EA] hover:bg-[#1B1C1E] border border-transparent'
              }`}
            >
              <ArrowDownWideNarrow className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Newest</span>
            </button>

            <button
              type="button"
              onClick={() => onSortChange('oldest')}
              aria-pressed={sort === 'oldest'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91] ${
                sort === 'oldest'
                  ? 'bg-[#222326] text-[#D6BD91] border border-[#D6BD91]/40'
                  : 'text-[#A5A29B] hover:text-[#F4F1EA] hover:bg-[#1B1C1E] border border-transparent'
              }`}
            >
              <ArrowUpNarrowWide className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Oldest</span>
            </button>
          </div>

          {/* Rows Per Page */}
          <div className="flex items-center gap-2">
            <label htmlFor="checks-per-page" className="text-xs text-[#A5A29B]">
              Rows
            </label>
            <select
              id="checks-per-page"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-[#101112] border border-[#30302E] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#F4F1EA] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91] hover:border-[#A8895D] transition-colors"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Body / States */}
      {isLoading ? (
        <div className="p-12 flex items-center justify-center gap-2.5 text-xs text-[#A5A29B]">
          <div className="w-5 h-5 rounded-full border-2 border-[#D6BD91] border-t-transparent motion-safe:animate-spin" />
          <span>Loading check observations...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-[#E05D5D]">
          Failed to load check history: {error.message}
        </div>
      ) : checks.length === 0 ? (
        <div className="p-10 text-center text-xs text-[#A5A29B]">
          No checks recorded for this endpoint yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#101112] text-[#A5A29B] uppercase tracking-wider text-[10px]">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  HTTP Code
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Latency
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Message
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Observed At
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-[#30302E] transition-opacity duration-150 ${
                isPlaceholderData ? 'opacity-60' : 'opacity-100'
              }`}
            >
              {checks.map((chk) => (
                <tr key={chk.id} className="hover:bg-[#222326]/40 transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                        chk.isSuccess
                          ? 'bg-[#57A97A]/10 text-[#57A97A] border border-[#57A97A]/20'
                          : 'bg-[#E05D5D]/10 text-[#E05D5D] border border-[#E05D5D]/20'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`w-1.5 h-1.5 rounded-full ${
                          chk.isSuccess ? 'bg-[#57A97A]' : 'bg-[#E05D5D]'
                        }`}
                      />
                      {chk.isSuccess ? 'PASSED' : 'FAILED'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono tabular-nums text-[#F4F1EA] whitespace-nowrap">
                    {chk.statusCode ?? '—'}
                  </td>
                  <td className="px-5 py-3 font-mono tabular-nums text-[#F4F1EA] whitespace-nowrap">
                    {chk.responseTimeMs !== null ? `${chk.responseTimeMs} ms` : '—'}
                  </td>
                  <td className="px-5 py-3 text-[#A5A29B] max-w-md truncate" title={chk.errorMessage ?? undefined}>
                    {chk.errorMessage || '—'}
                  </td>
                  <td className="px-5 py-3 text-right text-[#A5A29B] font-mono tabular-nums whitespace-nowrap">
                    {new Date(chk.checkedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {total > 0 && (
        <div className="px-5 py-3.5 border-t border-[#30302E] bg-[#151617]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-[#A5A29B] font-mono tabular-nums">
            Showing <span className="text-[#F4F1EA] font-medium">{startItem.toLocaleString()}</span>
            –<span className="text-[#F4F1EA] font-medium">{endItem.toLocaleString()}</span> of{' '}
            <span className="text-[#F4F1EA] font-medium">{total.toLocaleString()}</span> checks
            <span className="text-[#77756F] ml-2">
              (Page {currentPage} of {totalPages})
            </span>
          </div>

          <nav aria-label="Check history pagination" className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1 || isPlaceholderData}
              aria-label="First page"
              className="min-h-[34px] min-w-[34px] px-2 inline-flex items-center justify-center rounded border border-[#30302E] bg-[#101112] text-[#A5A29B] hover:text-[#F4F1EA] hover:border-[#A8895D] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#30302E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91]"
            >
              <ChevronsLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPlaceholderData}
              aria-label="Previous page"
              className="min-h-[34px] px-2.5 inline-flex items-center gap-1 rounded border border-[#30302E] bg-[#101112] text-xs text-[#A5A29B] hover:text-[#F4F1EA] hover:border-[#A8895D] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#30302E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91]"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {pageItems.map((item) =>
              item.type === 'ellipsis' ? (
                <span
                  key={item.key}
                  aria-hidden="true"
                  className="min-h-[34px] px-1.5 inline-flex items-center justify-center text-xs text-[#77756F] select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onPageChange(item.value)}
                  disabled={isPlaceholderData && item.value !== currentPage}
                  aria-label={`Page ${item.value}`}
                  aria-current={item.value === currentPage ? 'page' : undefined}
                  className={`min-h-[34px] min-w-[34px] px-2.5 inline-flex items-center justify-center rounded text-xs font-mono tabular-nums transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91] ${
                    item.value === currentPage
                      ? 'bg-[#D6BD91] text-[#101112] font-semibold border border-[#D6BD91]'
                      : 'bg-[#101112] text-[#A5A29B] border border-[#30302E] hover:text-[#F4F1EA] hover:border-[#A8895D]'
                  }`}
                >
                  {item.value}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPlaceholderData}
              aria-label="Next page"
              className="min-h-[34px] px-2.5 inline-flex items-center gap-1 rounded border border-[#30302E] bg-[#101112] text-xs text-[#A5A29B] hover:text-[#F4F1EA] hover:border-[#A8895D] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#30302E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91]"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages || isPlaceholderData}
              aria-label="Last page"
              className="min-h-[34px] min-w-[34px] px-2 inline-flex items-center justify-center rounded border border-[#30302E] bg-[#101112] text-[#A5A29B] hover:text-[#F4F1EA] hover:border-[#A8895D] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#30302E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91]"
            >
              <ChevronsRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      )}
    </section>
  );
}
