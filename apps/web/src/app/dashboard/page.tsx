'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Plus,
  ShieldAlert,
} from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.dashboard.getSummary();
      return res.data;
    },
    refetchInterval: 10000, // refresh every 10s
  });

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-wide text-[#F4F1EA]">Overview</h1>
            <p className="text-sm text-[#A5A29B] mt-1">Real-time infrastructure health and performance</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/monitors"
              className="inline-flex items-center gap-2 bg-[#D6BD91] hover:bg-[#C2A77A] text-[#101112] font-semibold px-4 py-2 rounded text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Monitor</span>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#D6BD91] border-t-transparent animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-[#E05D5D]/10 border border-[#E05D5D]/30 rounded text-sm text-[#E05D5D] flex justify-between items-center">
            <span>Failed to load dashboard metrics.</span>
            <button onClick={() => refetch()} className="underline font-medium">
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Overall Uptime */}
              <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-5">
                <div className="flex items-center justify-between text-[#A5A29B] text-xs uppercase tracking-wider mb-3">
                  <span>Uptime (24h)</span>
                  <CheckCircle2 className="w-4 h-4 text-[#57A97A]" />
                </div>
                <div className="text-3xl font-semibold text-[#F4F1EA]">
                  {data.overallUptime24h.toFixed(2)}%
                </div>
                <div className="text-xs text-[#57A97A] mt-2 flex items-center gap-1">
                  <span>Across {data.totalMonitors} endpoints</span>
                </div>
              </div>

              {/* Monitored Endpoints */}
              <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-5">
                <div className="flex items-center justify-between text-[#A5A29B] text-xs uppercase tracking-wider mb-3">
                  <span>Monitors</span>
                  <Activity className="w-4 h-4 text-[#D6BD91]" />
                </div>
                <div className="text-3xl font-semibold text-[#F4F1EA]">
                  {data.totalMonitors}
                </div>
                <div className="text-xs text-[#A5A29B] mt-2 flex gap-3">
                  <span className="text-[#57A97A]">{data.operationalMonitors} Operational</span>
                  {data.downMonitors > 0 && <span className="text-[#E05D5D]">{data.downMonitors} Down</span>}
                  {data.pausedMonitors > 0 && <span className="text-[#77756F]">{data.pausedMonitors} Paused</span>}
                </div>
              </div>

              {/* Average Latency */}
              <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-5">
                <div className="flex items-center justify-between text-[#A5A29B] text-xs uppercase tracking-wider mb-3">
                  <span>Avg Latency (24h)</span>
                  <Clock className="w-4 h-4 text-[#D6BD91]" />
                </div>
                <div className="text-3xl font-semibold text-[#F4F1EA]">
                  {data.averageResponseTime24h} <span className="text-base text-[#77756F] font-normal">ms</span>
                </div>
                <div className="text-xs text-[#A5A29B] mt-2">
                  Global observation latency
                </div>
              </div>

              {/* Active Incidents */}
              <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-5">
                <div className="flex items-center justify-between text-[#A5A29B] text-xs uppercase tracking-wider mb-3">
                  <span>Active Outages</span>
                  <AlertTriangle className={`w-4 h-4 ${data.activeIncidents > 0 ? 'text-[#E05D5D]' : 'text-[#57A97A]'}`} />
                </div>
                <div className={`text-3xl font-semibold ${data.activeIncidents > 0 ? 'text-[#E05D5D]' : 'text-[#57A97A]'}`}>
                  {data.activeIncidents}
                </div>
                <div className="text-xs text-[#A5A29B] mt-2">
                  {data.activeIncidents === 0 ? 'All services operational' : 'Attention required'}
                </div>
              </div>
            </div>

            {/* Split Content: Recent Incidents & Check Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Incidents */}
              <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-[#F4F1EA] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#D6BD91]" />
                    Recent Incidents
                  </h2>
                  <Link href="/incidents" className="text-xs text-[#D6BD91] hover:underline flex items-center gap-1">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>

                {data.recentIncidents.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[#77756F]">
                    No outages detected in this period.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.recentIncidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="p-3 bg-[#101112] border border-[#30302E] rounded flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-medium text-[#F4F1EA]">{incident.title}</div>
                          <div className="text-xs text-[#A5A29B] mt-0.5">
                            {incident.monitor?.name} &bull; {new Date(incident.startedAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            incident.status === 'RESOLVED'
                              ? 'bg-[#57A97A]/10 text-[#57A97A] border border-[#57A97A]/20'
                              : 'bg-[#E05D5D]/10 text-[#E05D5D] border border-[#E05D5D]/20'
                          }`}
                        >
                          {incident.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Check Stream */}
              <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-[#F4F1EA] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#D6BD91]" />
                    Observation Feed
                  </h2>
                  <span className="text-xs text-[#77756F]">Latest checks</span>
                </div>

                {data.recentChecks.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[#77756F]">
                    No check observations recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recentChecks.map((check) => (
                      <div
                        key={check.id}
                        className="px-3 py-2 bg-[#101112] border border-[#30302E] rounded flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              check.isSuccess ? 'bg-[#57A97A]' : 'bg-[#E05D5D]'
                            }`}
                          ></span>
                          <span className="font-medium text-[#F4F1EA]">{check.statusCode ?? 'ERR'}</span>
                          <span className="text-[#A5A29B]">
                            {check.responseTimeMs ? `${check.responseTimeMs}ms` : check.errorType}
                          </span>
                        </div>
                        <span className="text-[#77756F]">
                          {new Date(check.checkedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
