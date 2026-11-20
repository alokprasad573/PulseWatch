'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layout/app-layout';
import { MonitorMethod, MonitorStatus } from '@pulsewatch/shared';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

export default function MonitorsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<MonitorMethod>(MonitorMethod.GET);
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [expectedStatusCode, setExpectedStatusCode] = useState(200);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['monitors-list'],
    queryFn: async () => {
      const res = await api.monitors.list(1, 50);
      return res.data;
    },
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      return api.monitors.create({
        name,
        url,
        method,
        intervalSeconds: Number(intervalSeconds),
        timeoutMs: Number(timeoutMs),
        expectedStatusCode: Number(expectedStatusCode),
      });
    },
    onSuccess: () => {
      setIsModalOpen(false);
      setName('');
      setUrl('');
      queryClient.invalidateQueries({ queryKey: ['monitors-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create monitor');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      if (enabled) {
        return api.monitors.enable(id);
      } else {
        return api.monitors.disable(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors-list'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (confirm('Are you sure you want to delete this monitor? All check history will be removed.')) {
        return api.monitors.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors-list'] });
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-wide text-[#F4F1EA]">Monitors</h1>
            <p className="text-sm text-[#A5A29B] mt-1">Configure and inspect endpoint probes</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-[#D6BD91] hover:bg-[#C2A77A] text-[#101112] font-semibold px-4 py-2 rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Monitor</span>
          </button>
        </div>

        {/* Monitors List Table */}
        <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#D6BD91] border-t-transparent animate-spin"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-[#E05D5D]">Failed to load monitors.</div>
          ) : !data || data.length === 0 ? (
            <div className="p-16 text-center">
              <Activity className="w-10 h-10 text-[#77756F] mx-auto mb-3" />
              <h3 className="text-base font-medium text-[#F4F1EA]">No monitors registered yet</h3>
              <p className="text-sm text-[#A5A29B] mt-1 max-w-sm mx-auto">
                Begin by creating your first HTTP monitor to track latency, availability, and receive incident alerts.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 bg-[#D6BD91] text-[#101112] font-semibold px-4 py-2 rounded text-sm hover:bg-[#C2A77A] transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Monitor
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#30302E]">
              {data.map((monitor) => {
                const isUp = monitor.status === MonitorStatus.UP;
                const isDown = monitor.status === MonitorStatus.DOWN;
                const isPaused = !monitor.enabled || monitor.status === MonitorStatus.PAUSED;

                return (
                  <div
                    key={monitor.id}
                    className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-[#222326]/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Status indicator dot */}
                      <div className="mt-1">
                        <span
                          className={`inline-block w-3 h-3 rounded-full ${
                            isPaused
                              ? 'bg-[#77756F]'
                              : isUp
                              ? 'bg-[#57A97A]'
                              : isDown
                              ? 'bg-[#E05D5D] animate-pulse'
                              : 'bg-[#D6BD91]'
                          }`}
                        ></span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/monitors/${monitor.id}`}
                            className="font-medium text-[#F4F1EA] hover:text-[#D6BD91] transition-colors text-base"
                          >
                            {monitor.name}
                          </Link>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#101112] text-[#A5A29B] border border-[#30302E]">
                            {monitor.method}
                          </span>
                        </div>
                        <div className="text-xs text-[#A5A29B] font-mono mt-1 break-all">
                          {monitor.url}
                        </div>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-6 self-end md:self-auto text-xs">
                      <div className="text-right">
                        <div className="text-[#77756F] uppercase tracking-wider text-[10px]">Uptime 24h</div>
                        <div className="font-semibold text-[#F4F1EA] text-sm mt-0.5">
                          {monitor.uptime24h !== undefined ? `${monitor.uptime24h.toFixed(1)}%` : '—'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[#77756F] uppercase tracking-wider text-[10px]">Avg Latency</div>
                        <div className="font-semibold text-[#F4F1EA] text-sm mt-0.5">
                          {monitor.avgResponseTime24h ? `${monitor.avgResponseTime24h}ms` : '—'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-4 border-l border-[#30302E]">
                        <button
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: monitor.id,
                              enabled: !monitor.enabled,
                            })
                          }
                          className="p-1.5 text-[#A5A29B] hover:text-[#F4F1EA] hover:bg-[#101112] rounded transition-colors"
                          title={monitor.enabled ? 'Pause monitoring' : 'Resume monitoring'}
                        >
                          {monitor.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => deleteMutation.mutate(monitor.id)}
                          className="p-1.5 text-[#77756F] hover:text-[#E05D5D] hover:bg-[#101112] rounded transition-colors"
                          title="Delete monitor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <Link
                          href={`/monitors/${monitor.id}`}
                          className="p-1.5 text-[#D6BD91] hover:bg-[#101112] rounded transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Monitor Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg max-w-lg w-full p-6 shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-[#30302E] mb-5">
                <h3 className="text-lg font-semibold text-[#F4F1EA]">Add New Monitor</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#77756F] hover:text-[#F4F1EA]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-[#E05D5D]/10 border border-[#E05D5D]/30 rounded text-xs text-[#E05D5D]">
                  {formError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-[#A5A29B] uppercase tracking-wider mb-1 font-medium">
                    Monitor Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Production API Health"
                    className="w-full bg-[#101112] border border-[#30302E] rounded px-3 py-2 text-sm text-[#F4F1EA] focus:border-[#D6BD91] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#A5A29B] uppercase tracking-wider mb-1 font-medium">
                    Target URL
                  </label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/health"
                    className="w-full bg-[#101112] border border-[#30302E] rounded px-3 py-2 text-sm text-[#F4F1EA] focus:border-[#D6BD91] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#A5A29B] uppercase tracking-wider mb-1 font-medium">
                      HTTP Method
                    </label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as MonitorMethod)}
                      className="w-full bg-[#101112] border border-[#30302E] rounded px-3 py-2 text-sm text-[#F4F1EA] focus:border-[#D6BD91] focus:outline-none"
                    >
                      <option value="GET">GET</option>
                      <option value="HEAD">HEAD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#A5A29B] uppercase tracking-wider mb-1 font-medium">
                      Expected Status
                    </label>
                    <input
                      type="number"
                      value={expectedStatusCode}
                      onChange={(e) => setExpectedStatusCode(parseInt(e.target.value, 10))}
                      className="w-full bg-[#101112] border border-[#30302E] rounded px-3 py-2 text-sm text-[#F4F1EA] focus:border-[#D6BD91] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#A5A29B] uppercase tracking-wider mb-1 font-medium">
                      Interval (Seconds)
                    </label>
                    <select
                      value={intervalSeconds}
                      onChange={(e) => setIntervalSeconds(parseInt(e.target.value, 10))}
                      className="w-full bg-[#101112] border border-[#30302E] rounded px-3 py-2 text-sm text-[#F4F1EA] focus:border-[#D6BD91] focus:outline-none"
                    >
                      <option value={30}>30 seconds</option>
                      <option value={60}>60 seconds (1 min)</option>
                      <option value={300}>300 seconds (5 min)</option>
                      <option value={600}>600 seconds (10 min)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#A5A29B] uppercase tracking-wider mb-1 font-medium">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      step={1000}
                      value={timeoutMs}
                      onChange={(e) => setTimeoutMs(parseInt(e.target.value, 10))}
                      className="w-full bg-[#101112] border border-[#30302E] rounded px-3 py-2 text-sm text-[#F4F1EA] focus:border-[#D6BD91] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-[#30302E]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded text-sm text-[#A5A29B] hover:text-[#F4F1EA]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-[#D6BD91] hover:bg-[#C2A77A] text-[#101112] font-semibold px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Saving...' : 'Create Monitor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
