'use client';

import React, { useMemo } from 'react';
import { MonitorAnalyticsDto, MonitorMetricsRange } from '@pulsewatch/shared';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Clock } from 'lucide-react';

export const CHART_RANGE_OPTIONS: Array<{
  value: MonitorMetricsRange;
  label: string;
  description: string;
}> = [
  { value: '1d', label: '1 Day', description: 'Past 24 Hours' },
  { value: '7d', label: '7 Days', description: 'Past 7 Days' },
  { value: '30d', label: '30 Days', description: 'Past 30 Days' },
  { value: '3m', label: '3 Months', description: 'Past 3 Months' },
  { value: '6m', label: '6 Months', description: 'Past 6 Months' },
  { value: '9m', label: '9 Months', description: 'Past 9 Months' },
  { value: '12m', label: '12 Months', description: 'Past 12 Months' },
  { value: 'lifetime', label: 'Lifetime', description: 'All Recorded History' },
];

interface ChartDatum {
  rawTimestamp: string;
  latency: number | null;
  minLatency: number | null;
  maxLatency: number | null;
  isSuccess: boolean;
  statusCode: number | null;
  sampleCount: number;
  successRate: number;
}

interface ResponseTimeChartProps {
  metrics: MonitorAnalyticsDto | undefined;
  range: MonitorMetricsRange;
  onRangeChange: (range: MonitorMetricsRange) => void;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

function formatBucketLabel(bucketSeconds: number | null | undefined): string {
  if (!bucketSeconds) return 'Raw samples';
  if (bucketSeconds < 60) return `${bucketSeconds}s buckets`;
  if (bucketSeconds < 3600) return `${Math.round(bucketSeconds / 60)}m buckets`;
  if (bucketSeconds < 86400) return `${Math.round(bucketSeconds / 3600)}h buckets`;
  if (bucketSeconds < 604800) return `${Math.round(bucketSeconds / 86400)}d buckets`;
  return `${Math.round(bucketSeconds / 604800)}w buckets`;
}

function formatAxisTick(iso: string, spanMs: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  if (spanMs <= 36 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (spanMs <= 14 * 24 * 60 * 60 * 1000) {
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (spanMs <= 366 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
}

function formatDateRangeSpan(startAt: string | null, endAt: string | null): string | null {
  if (!startAt || !endAt) return null;
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined,
  };
  return `${start.toLocaleDateString([], opts)} – ${end.toLocaleDateString([], opts)}`;
}

interface TooltipPayloadItem {
  payload?: ChartDatum;
}

function TelemetryTooltip({
  active,
  payload,
  bucketSeconds,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  bucketSeconds?: number | null;
}) {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) {
    return null;
  }

  const point = payload[0].payload;
  const isAggregated = point.sampleCount > 1;
  const formattedTime = new Date(point.rawTimestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(isAggregated ? {} : { second: '2-digit' }),
  });

  return (
    <div className="bg-[#151617]/95 backdrop-blur-sm border border-[#30302E] rounded-md px-3.5 py-2.5 shadow-xl text-xs space-y-1.5 min-w-[190px]">
      <div className="text-[#F4F1EA] font-medium font-mono tabular-nums">{formattedTime}</div>

      <div className="flex items-center justify-between gap-4 pt-1 border-t border-[#30302E]">
        <span className="text-[#A5A29B]">{isAggregated ? 'Avg Latency' : 'Latency'}</span>
        <span className="font-mono font-semibold text-[#D6BD91] tabular-nums">
          {point.latency !== null ? `${point.latency} ms` : 'Timeout / Error'}
        </span>
      </div>

      {isAggregated && point.minLatency !== null && point.maxLatency !== null && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#A5A29B]">Min / Max</span>
          <span className="font-mono text-[#F4F1EA] tabular-nums">
            {point.minLatency} – {point.maxLatency} ms
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <span className="text-[#A5A29B]">{isAggregated ? 'Reliability' : 'Status'}</span>
        {isAggregated ? (
          <span
            className={`font-mono font-medium tabular-nums ${
              point.successRate >= 99
                ? 'text-[#57A97A]'
                : point.successRate >= 95
                ? 'text-[#D4A359]'
                : 'text-[#E05D5D]'
            }`}
          >
            {point.successRate}% ({point.sampleCount} checks)
          </span>
        ) : (
          <span
            className={`font-mono font-medium ${
              point.isSuccess ? 'text-[#57A97A]' : 'text-[#E05D5D]'
            }`}
          >
            {point.isSuccess ? 'PASSED' : 'FAILED'}
            {point.statusCode ? ` • HTTP ${point.statusCode}` : ''}
          </span>
        )}
      </div>

      {isAggregated && bucketSeconds && (
        <div className="text-[10px] text-[#A5A29B] pt-1 border-t border-[#30302E]/60">
          Window granularity: {formatBucketLabel(bucketSeconds)}
        </div>
      )}
    </div>
  );
}

/**
 * Interactive response-time telemetry chart with multi-horizon range filters.
 */
export function ResponseTimeChart({
  metrics,
  range,
  onRangeChange,
  isLoading,
  isFetching,
  error,
}: ResponseTimeChartProps) {
  const activeOption =
    CHART_RANGE_OPTIONS.find((opt) => opt.value === range) ?? CHART_RANGE_OPTIONS[0];

  const chartData = useMemo<ChartDatum[]>(() => {
    if (!metrics?.history) return [];
    return metrics.history.map((h) => ({
      rawTimestamp: h.timestamp,
      latency: h.responseTimeMs,
      minLatency: h.minResponseTimeMs ?? null,
      maxLatency: h.maxResponseTimeMs ?? null,
      isSuccess: h.isSuccess,
      statusCode: h.statusCode,
      sampleCount: h.sampleCount ?? 1,
      successRate: h.successRate ?? (h.isSuccess ? 100 : 0),
    }));
  }, [metrics?.history]);

  const spanMs = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = new Date(chartData[0].rawTimestamp).getTime();
    const last = new Date(chartData[chartData.length - 1].rawTimestamp).getTime();
    return Math.max(0, last - first);
  }, [chartData]);

  const rangeStats = metrics?.rangeStats;
  const observationSpan = rangeStats
    ? formatDateRangeSpan(rangeStats.startAt, rangeStats.endAt)
    : null;

  return (
    <section
      aria-labelledby="response-time-chart-heading"
      className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-5 sm:p-6 space-y-5"
    >
      {/* Header and Range Filter Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2
              id="response-time-chart-heading"
              className="text-base font-semibold text-[#F4F1EA] flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-[#D6BD91]" aria-hidden="true" />
              <span>Response Time (ms)</span>
            </h2>
            <span className="text-xs text-[#A5A29B] px-2 py-0.5 rounded bg-[#101112] border border-[#30302E]">
              {activeOption.description}
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
          {observationSpan && (
            <p className="text-xs text-[#A5A29B] font-mono tabular-nums">
              Observations: {observationSpan}
            </p>
          )}
        </div>

        <div
          role="group"
          aria-label="Chart time range"
          className="flex flex-wrap items-center gap-1 bg-[#101112] border border-[#30302E] p-1 rounded-lg"
        >
          {CHART_RANGE_OPTIONS.map((option) => {
            const isActive = option.value === range;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onRangeChange(option.value)}
                aria-pressed={isActive}
                title={option.description}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91] ${
                  isActive
                    ? 'bg-[#222326] text-[#D6BD91] border border-[#D6BD91]/40'
                    : 'text-[#A5A29B] hover:text-[#F4F1EA] hover:bg-[#1B1C1E] border border-transparent'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Range Telemetry Strip */}
      {rangeStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#101112]/80 border border-[#30302E] rounded-md px-3.5 py-2.5">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider">
              Window Avg Latency
            </div>
            <div className="text-base font-semibold text-[#F4F1EA] font-mono tabular-nums mt-0.5">
              {rangeStats.totalChecks > 0 ? `${rangeStats.avgResponseTimeMs} ms` : '—'}
            </div>
          </div>

          <div className="bg-[#101112]/80 border border-[#30302E] rounded-md px-3.5 py-2.5">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider">
              Min / Max Spread
            </div>
            <div className="text-base font-semibold text-[#F4F1EA] font-mono tabular-nums mt-0.5">
              {rangeStats.totalChecks > 0
                ? `${rangeStats.minResponseTimeMs} – ${rangeStats.maxResponseTimeMs} ms`
                : '—'}
            </div>
          </div>

          <div className="bg-[#101112]/80 border border-[#30302E] rounded-md px-3.5 py-2.5">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider">
              Window Availability
            </div>
            <div
              className={`text-base font-semibold font-mono tabular-nums mt-0.5 ${
                rangeStats.totalChecks === 0
                  ? 'text-[#A5A29B]'
                  : rangeStats.uptime >= 99
                  ? 'text-[#57A97A]'
                  : rangeStats.uptime >= 95
                  ? 'text-[#D4A359]'
                  : 'text-[#E05D5D]'
              }`}
            >
              {rangeStats.totalChecks > 0 ? `${rangeStats.uptime.toFixed(2)}%` : '—'}
            </div>
          </div>

          <div className="bg-[#101112]/80 border border-[#30302E] rounded-md px-3.5 py-2.5">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider">
              Evaluated Samples
            </div>
            <div className="text-base font-semibold text-[#F4F1EA] font-mono tabular-nums mt-0.5 flex items-baseline gap-2 flex-wrap">
              <span>{rangeStats.totalChecks.toLocaleString()}</span>
              <span className="text-[11px] font-sans font-normal text-[#A5A29B]">
                {formatBucketLabel(rangeStats.bucketSeconds)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Plot Area */}
      {isLoading ? (
        <div className="h-72 w-full rounded-md bg-[#101112]/60 border border-[#30302E] flex items-center justify-center">
          <div className="flex items-center gap-2.5 text-xs text-[#A5A29B]">
            <div className="w-5 h-5 rounded-full border-2 border-[#D6BD91] border-t-transparent motion-safe:animate-spin" />
            <span>Loading response telemetry...</span>
          </div>
        </div>
      ) : error ? (
        <div className="h-72 w-full rounded-md bg-[#E05D5D]/5 border border-[#E05D5D]/30 flex items-center justify-center px-4 text-center">
          <p className="text-xs text-[#E05D5D]">
            Unable to load response time history: {error.message}
          </p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-72 w-full rounded-md bg-[#101112]/60 border border-[#30302E] flex flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-xs text-[#A5A29B]">
            No observations recorded for {activeOption.description.toLowerCase()}.
          </p>
          {range !== 'lifetime' && (
            <button
              type="button"
              onClick={() => onRangeChange('lifetime')}
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#222326] text-[#D6BD91] border border-[#D6BD91]/40 hover:bg-[#2A2B2E] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6BD91]"
            >
              Switch to Lifetime
            </button>
          )}
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D6BD91" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#D6BD91" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#30302E" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="rawTimestamp"
                tickFormatter={(val: string) => formatAxisTick(val, spanMs)}
                minTickGap={36}
                stroke="#A5A29B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#30302E' }}
              />
              <YAxis
                stroke="#A5A29B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#30302E' }}
                tickFormatter={(val: number) => `${val}ms`}
                width={58}
              />
              <Tooltip
                content={<TelemetryTooltip bucketSeconds={rangeStats?.bucketSeconds} />}
                cursor={{ stroke: '#A8895D', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="#D6BD91"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#latencyGradient)"
                connectNulls
                isAnimationActive={false}
                activeDot={{ r: 4, fill: '#D6BD91', stroke: '#101112', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
