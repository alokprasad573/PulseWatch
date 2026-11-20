'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layout/app-layout';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';

export default function MonitorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data: monitor, isLoading: loadingMonitor } = useQuery({
    queryKey: ['monitor-detail', id],
    queryFn: async () => {
      const res = await api.monitors.get(id);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['monitor-metrics', id],
    queryFn: async () => {
      const res = await api.monitors.getMetrics(id);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: checks, isLoading: loadingChecks } = useQuery({
    queryKey: ['monitor-checks', id],
    queryFn: async () => {
      const res = await api.monitors.getChecks(id, 40);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        return api.monitors.enable(id);
      } else {
        return api.monitors.disable(id);
      }
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

  if (loadingMonitor) {
    return (
      <AppLayout>
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#D6BD91] border-t-transparent animate-spin"></div>
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

  const chartData = metrics?.history.map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    latency: h.responseTimeMs ?? 0,
    status: h.isSuccess ? 'UP' : 'DOWN',
  })) ?? [];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Back and Header */}
        <div>
          <button
            onClick={() => router.push('/monitors')}
            className="inline-flex items-center gap-1.5 text-xs text-[#A5A29B] hover:text-[#F4F1EA] mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Monitors</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-wide text-[#F4F1EA]">{monitor.name}</h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-medium ${
                    monitor.status === 'UP'
                      ? 'bg-[#57A97A]/10 text-[#57A97A] border border-[#57A97A]/20'
                      : monitor.status === 'DOWN'
                      ? 'bg-[#E05D5D]/10 text-[#E05D5D] border border-[#E05D5D]/20 animate-pulse'
                      : 'bg-[#77756F]/10 text-[#77756F] border border-[#77756F]/20'
                  }`}
                >
                  {monitor.status}
                </span>
              </div>
              <div className="text-xs text-[#A5A29B] font-mono mt-1 flex items-center gap-2">
                <span className="text-[#D6BD91] font-bold">{monitor.method}</span>
                <span>{monitor.url}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleMutation.mutate(!monitor.enabled)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs bg-[#1B1C1E] border border-[#30302E] text-[#F4F1EA] hover:border-[#D6BD91] transition-colors"
              >
                {monitor.enabled ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-[#A5A29B]" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#57A97A]" /> Resume
                  </>
                )}
              </button>

              <button
                onClick={() => deleteMutation.mutate()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs bg-[#1B1C1E] border border-[#30302E] text-[#E05D5D] hover:bg-[#E05D5D]/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-4">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider mb-1">24h Availability</div>
            <div className="text-2xl font-semibold text-[#F4F1EA]">
              {metrics ? `${metrics.uptime24h.toFixed(2)}%` : '—'}
            </div>
          </div>

          <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-4">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider mb-1">30d Availability</div>
            <div className="text-2xl font-semibold text-[#F4F1EA]">
              {metrics ? `${metrics.uptime30d.toFixed(2)}%` : '—'}
            </div>
          </div>

          <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-4">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider mb-1">Avg Response Time</div>
            <div className="text-2xl font-semibold text-[#F4F1EA]">
              {metrics?.avgResponseTime24h ?? 0} <span className="text-xs text-[#77756F]">ms</span>
            </div>
          </div>

          <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-4">
            <div className="text-[10px] text-[#A5A29B] uppercase tracking-wider mb-1">Interval / Timeout</div>
            <div className="text-base font-semibold text-[#F4F1EA] mt-1">
              {monitor.intervalSeconds}s / {monitor.timeoutMs}ms
            </div>
          </div>
        </div>

        {/* Latency History Chart */}
        <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-[#F4F1EA] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D6BD91]" /> Response Time (ms)
            </h2>
            <span className="text-xs text-[#77756F]">Past 24 Hours</span>
          </div>

          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#77756F]">
              Insufficient observation history.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D6BD91" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D6BD91" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    stroke="#77756F"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#30302E' }}
                  />
                  <YAxis
                    stroke="#77756F"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#30302E' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151617',
                      borderColor: '#30302E',
                      borderRadius: '4px',
                      color: '#F4F1EA',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="#D6BD91"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#latencyGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Checks Table */}
        <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg overflow-hidden">
          <div className="p-5 border-b border-[#30302E]">
            <h2 className="text-base font-semibold text-[#F4F1EA] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#D6BD91]" /> Detailed Check History
            </h2>
          </div>

          {!checks || checks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#77756F]">
              No checks recorded for this endpoint yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#101112] text-[#77756F] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">HTTP Code</th>
                    <th className="px-5 py-3">Latency</th>
                    <th className="px-5 py-3">Message</th>
                    <th className="px-5 py-3 text-right">Observed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30302E]">
                  {checks.map((chk) => (
                    <tr key={chk.id} className="hover:bg-[#222326]/40 transition-colors">
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                            chk.isSuccess
                              ? 'bg-[#57A97A]/10 text-[#57A97A]'
                              : 'bg-[#E05D5D]/10 text-[#E05D5D]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              chk.isSuccess ? 'bg-[#57A97A]' : 'bg-[#E05D5D]'
                            }`}
                          ></span>
                          {chk.isSuccess ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-[#F4F1EA]">
                        {chk.statusCode ?? '—'}
                      </td>
                      <td className="px-5 py-3 font-mono text-[#F4F1EA]">
                        {chk.responseTimeMs ? `${chk.responseTimeMs}ms` : '—'}
                      </td>
                      <td className="px-5 py-3 text-[#A5A29B]">
                        {chk.errorMessage || '—'}
                      </td>
                      <td className="px-5 py-3 text-right text-[#77756F] font-mono">
                        {new Date(chk.checkedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
