'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layout/app-layout';
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, ShieldAlert } from 'lucide-react';

export default function IncidentsPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['incidents-list', selectedStatus],
    queryFn: async () => {
      const res = await api.incidents.list(1, 50, selectedStatus || undefined);
      return res.data;
    },
    refetchInterval: 15000,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-wide text-[#F4F1EA]">Incidents</h1>
            <p className="text-sm text-[#A5A29B] mt-1">Audit trail of outages and recoveries</p>
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1 bg-[#1B1C1E] border border-[#30302E] p-1 rounded-lg text-xs">
            {['', 'OPEN', 'RECOVERING', 'RESOLVED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded transition-colors ${
                  selectedStatus === st
                    ? 'bg-[#222326] text-[#D6BD91] font-medium'
                    : 'text-[#A5A29B] hover:text-[#F4F1EA]'
                }`}
              >
                {st === '' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Incidents List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#D6BD91] border-t-transparent animate-spin"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-[#E05D5D]/10 border border-[#E05D5D]/30 rounded text-sm text-[#E05D5D]">
              Failed to load incident history.
            </div>
          ) : !data || data.length === 0 ? (
            <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#57A97A] mx-auto mb-3" />
              <h3 className="text-base font-medium text-[#F4F1EA]">No incidents found</h3>
              <p className="text-sm text-[#77756F] mt-1">
                {selectedStatus ? `No incidents with status ${selectedStatus}` : 'All services operational.'}
              </p>
            </div>
          ) : (
            data.map((incident) => {
              const isResolved = incident.status === 'RESOLVED';
              const isRecovering = incident.status === 'RECOVERING';

              return (
                <div
                  key={incident.id}
                  className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-6 hover:border-[#A8895D]/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded font-medium ${
                            isResolved
                              ? 'bg-[#57A97A]/10 text-[#57A97A] border border-[#57A97A]/20'
                              : isRecovering
                              ? 'bg-[#D4A359]/10 text-[#D4A359] border border-[#D4A359]/20'
                              : 'bg-[#E05D5D]/10 text-[#E05D5D] border border-[#E05D5D]/20 animate-pulse'
                          }`}
                        >
                          {incident.status}
                        </span>
                        <h3 className="text-base font-semibold text-[#F4F1EA]">{incident.title}</h3>
                      </div>
                      <div className="text-xs text-[#A5A29B] mt-1">
                        Endpoint:{' '}
                        <Link
                          href={`/monitors/${incident.monitorId}`}
                          className="text-[#D6BD91] hover:underline"
                        >
                          {incident.monitor?.name ?? incident.monitorId}
                        </Link>
                      </div>
                    </div>

                    <div className="text-xs text-[#77756F] text-right font-mono">
                      Started: {new Date(incident.startedAt).toLocaleString()}
                      {incident.resolvedAt && (
                        <div className="text-[#57A97A] mt-0.5">
                          Resolved: {new Date(incident.resolvedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Incident Description */}
                  {incident.description && (
                    <p className="text-xs text-[#A5A29B] bg-[#101112] p-3 rounded border border-[#30302E] mb-4 font-mono">
                      {incident.description}
                    </p>
                  )}

                  {/* Incident Events Timeline */}
                  {incident.events && incident.events.length > 0 && (
                    <div className="border-t border-[#30302E] pt-3 mt-3">
                      <div className="text-[10px] text-[#77756F] uppercase tracking-wider mb-2 font-medium">
                        Timeline Events ({incident.events.length})
                      </div>
                      <div className="space-y-2">
                        {incident.events.map((evt) => (
                          <div key={evt.id} className="text-xs flex items-start gap-3">
                            <span className="text-[#77756F] font-mono text-[11px] whitespace-nowrap pt-0.5">
                              {new Date(evt.createdAt).toLocaleTimeString()}
                            </span>
                            <div className="text-[#F4F1EA] flex-1">
                              <span className="font-semibold text-[#D6BD91] mr-2">
                                {evt.eventType}
                              </span>
                              <span className="text-[#A5A29B]">{evt.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
