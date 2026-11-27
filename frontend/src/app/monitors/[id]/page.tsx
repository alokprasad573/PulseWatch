'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MonitorChecksSort, MonitorMetricsRange } from '@pulsewatch/shared';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layout/app-layout';
import { ResponseTimeChart } from '@/components/monitors/response-time-chart';
import { CheckHistoryTable } from '@/components/monitors/check-history-table';
import { ArrowLeft, Pause, Play, Trash2 } from 'lucide-react';

export default function MonitorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [chartRange, setChartRange] = useState<MonitorMetricsRange>('1d');
  const [checksPage, setChecksPage] = useState<number>(1);
  const [checksLimit, setChecksLimit] = useState<number>(10);
  const [checksSort, setChecksSort] = useState<MonitorChecksSort>('newest');

  const { data: monitor, isLoading: loadingMonitor } = useQuery({
    queryKey: ['monitor-detail', id],
    queryFn: async () => {
      const res = await api.monitors.get(id);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const {
    data: metrics,
    isLoading: loadingMetrics,
    isFetching: fetchingMetrics,
    error: metricsError,
  } = useQuery({
    queryKey: ['monitor-metrics', id, chartRange],
    queryFn: async () => {
      const res = await api.monitors.getMetrics(id, chartRange);
      return res.data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 10000,
  });

  const {
    data: checksResponse,
    isLoading: loadingChecks,
    isFetching: fetchingChecks,
    isPlaceholderData: isChecksPlaceholder,
    error: checksError,
  } = useQuery({
    queryKey: ['monitor-checks', id, checksPage, checksLimit, checksSort],
    queryFn: async () => {
      return api.monitors.getChecks(id, {
        page: checksPage,
        limit: checksLimit,
        sort: checksSort,
      });
    },
    placeholderData: keepPreviousData,
    refetchInterval: 10000,
  });

  const totalPages = checksResponse?.meta?.totalPages;
  useEffect(() => {
    if (totalPages && checksPage > totalPages) {
      setChecksPage(totalPages);
    }
  }, [totalPages, checksPage]);

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        return api.monitors.enable(id);
      }
      return api.monitors.disable(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-detail', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (confirm('Delete this monitor permanently?')) {
        await api.monitors.delete(id);
        router.push('/monitors');
      }
    },
  });

  const handleSortChange = (nextSort: MonitorChecksSort) => {
    if (nextSort === checksSort) return;
    setChecksSort(nextSort);
    setChecksPage(1);
  };

  const handleLimitChange = (nextLimit: number) => {
    setChecksLimit(nextLimit);
    setChecksPage(1);
  };

  if (loadingMonitor) {
    return (
      <AppLayout>
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#D6BD91] border-t-transparent motion-safe:animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!monitor) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-[#E05D5D]">Monitor not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Back and Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push('/monitors')}
            className="inline-flex items-center gap-1.5 text-xs text-[#A5A29B] hover:text-[#F4F1EA] mb-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91] rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Monitors</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-wide text-[#F4F1EA] break-words">
                  {monitor.name}
                </h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-medium ${
                    monitor.status === 'UP'
                      ? 'bg-[#57A97A]/10 text-[#57A97A] border border-[#57A97A]/20'
                      : monitor.status === 'DOWN'
                      ? 'bg-[#E05D5D]/10 text-[#E05D5D] border border-[#E05D5D]/20 motion-safe:animate-pulse'
                      : 'bg-[#77756F]/10 text-[#A5A29B] border border-[#77756F]/20'
                  }`}
                >
                  {monitor.status}
                </span>
              </div>
              <div className="text-xs text-[#A5A29B] font-mono mt-1 flex items-center gap-2 flex-wrap break-all">
                <span className="text-[#D6BD91] font-bold">{monitor.method}</span>
                <span>{monitor.url}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate(!monitor.enabled)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs bg-[#1B1C1E] border border-[#30302E] text-[#F4F1EA] hover:border-[#D6BD91] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91]"
              >
                {monitor.enabled ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-[#A5A29B]" aria-hidden="true" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#57A97A]" aria-hidden="true" /> Resume
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs bg-[#1B1C1E] border border-[#30302E] text-[#E05D5D] hover:bg-[#E05D5D]/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91]"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-4">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider mb-1">
              24h Availability
            </div>
            <div className="text-2xl font-semibold text-[#F4F1EA] font-mono tabular-nums">
              {metrics ? `${metrics.uptime24h.toFixed(2)}%` : '—'}
            </div>
          </div>

          <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-4">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider mb-1">
              30d Availability
            </div>
            <div className="text-2xl font-semibold text-[#F4F1EA] font-mono tabular-nums">
              {metrics ? `${metrics.uptime30d.toFixed(2)}%` : '—'}
            </div>
          </div>

          <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-4">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider mb-1">
              Avg Response Time
            </div>
            <div className="text-2xl font-semibold text-[#F4F1EA] font-mono tabular-nums">
              {metrics?.avgResponseTime24h ?? 0}{' '}
              <span className="text-xs font-sans text-[#A5A29B]">ms</span>
            </div>
          </div>

          <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-4">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider mb-1">
              Interval / Timeout
            </div>
            <div className="text-base font-semibold text-[#F4F1EA] font-mono tabular-nums mt-1">
              {monitor.intervalSeconds}s / {monitor.timeoutMs}ms
            </div>
          </div>
        </div>

        {/* Latency History Chart with Range Filters */}
        <ResponseTimeChart
          metrics={metrics}
          range={chartRange}
          onRangeChange={setChartRange}
          isLoading={loadingMetrics}
          isFetching={fetchingMetrics}
          error={metricsError instanceof Error ? metricsError : null}
        />

        {/* Paginated & Sortable Checks Table */}
        <CheckHistoryTable
          checks={checksResponse?.data ?? []}
          meta={checksResponse?.meta}
          page={checksPage}
          limit={checksLimit}
          sort={checksSort}
          isLoading={loadingChecks}
          isFetching={fetchingChecks}
          isPlaceholderData={isChecksPlaceholder}
          error={checksError instanceof Error ? checksError : null}
          onPageChange={setChecksPage}
          onLimitChange={handleLimitChange}
          onSortChange={handleSortChange}
        />
      </div>
    </AppLayout>
  );
}
