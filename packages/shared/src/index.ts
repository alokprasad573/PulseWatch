// Domain Enums matching PostgreSQL schema
export enum MonitorStatus {
  UNKNOWN = 'UNKNOWN',
  UP = 'UP',
  DOWN = 'DOWN',
  PAUSED = 'PAUSED',
}

export enum MonitorMethod {
  GET = 'GET',
  HEAD = 'HEAD',
}

export enum OccurrenceStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  RECOVERING = 'RECOVERING',
  RESOLVED = 'RESOLVED',
}

export enum IncidentEventType {
  INCIDENT_OPENED = 'INCIDENT_OPENED',
  RECOVERY_STARTED = 'RECOVERY_STARTED',
  INCIDENT_REOPENED = 'INCIDENT_REOPENED',
  INCIDENT_RESOLVED = 'INCIDENT_RESOLVED',
}

export enum OutboxStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

// API Standard Response Format
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]> | null;
  timestamp: string;
  path: string;
}

// Auth Contracts
export interface UserDto {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: string;
  user: UserDto;
}

export interface JwtPayload {
  sub: string;
  email: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

// Monitor Contracts
export interface CreateMonitorInput {
  name: string;
  url: string;
  method?: MonitorMethod;
  intervalSeconds?: number;
  timeoutMs?: number;
  expectedStatusCode?: number;
  enabled?: boolean;
}

export interface UpdateMonitorInput {
  name?: string;
  url?: string;
  method?: MonitorMethod;
  intervalSeconds?: number;
  timeoutMs?: number;
  expectedStatusCode?: number;
  enabled?: boolean;
}

export interface MonitorDto {
  id: string;
  userId: string;
  name: string;
  url: string;
  method: MonitorMethod;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatusCode: number;
  enabled: boolean;
  status: MonitorStatus;
  nextCheckAt: string | null;
  createdAt: string;
  updatedAt: string;
  uptime24h?: number;
  avgResponseTime24h?: number;
  lastCheck?: MonitorCheckDto | null;
}

// Monitoring Occurrence & Job Contract
export interface MonitoringJob {
  monitorId: string;
  occurrenceId: string;
  scheduledAt: string;
  url: string;
  method: MonitorMethod;
  timeoutMs: number;
  expectedStatusCode: number;
}

export interface MonitorCheckDto {
  id: string;
  monitorId: string;
  occurrenceId: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  isSuccess: boolean;
  errorType: string | null;
  errorMessage: string | null;
  checkedAt: string;
  createdAt: string;
}

// Incident Contracts
export interface IncidentDto {
  id: string;
  monitorId: string;
  title: string;
  description: string | null;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  monitor?: {
    id: string;
    name: string;
    url: string;
  };
  events?: IncidentEventDto[];
}

export interface IncidentEventDto {
  id: string;
  incidentId: string;
  eventType: IncidentEventType;
  message: string;
  metadata: Record<string, any> | null;
  createdAt: string;
}

// Dashboard & Analytics Contracts
export interface DashboardSummaryDto {
  totalMonitors: number;
  operationalMonitors: number;
  downMonitors: number;
  pausedMonitors: number;
  activeIncidents: number;
  overallUptime24h: number;
  averageResponseTime24h: number;
  recentIncidents: IncidentDto[];
  recentChecks: MonitorCheckDto[];
}

export type MonitorMetricsRange =
  | '1d'
  | '7d'
  | '30d'
  | '3m'
  | '6m'
  | '9m'
  | '12m'
  | 'lifetime';

export type MonitorChecksSort = 'newest' | 'oldest';

export interface MonitorMetricsPointDto {
  timestamp: string;
  responseTimeMs: number | null;
  isSuccess: boolean;
  statusCode: number | null;
  minResponseTimeMs?: number | null;
  maxResponseTimeMs?: number | null;
  sampleCount?: number;
  successRate?: number;
}

export interface MonitorRangeStatsDto {
  range: MonitorMetricsRange;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  uptime: number;
  avgResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  bucketSeconds: number | null;
  startAt: string | null;
  endAt: string | null;
}

export interface MonitorAnalyticsDto {
  monitorId: string;
  range?: MonitorMetricsRange;
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
  avgResponseTime24h: number;
  minResponseTime24h: number;
  maxResponseTime24h: number;
  rangeStats?: MonitorRangeStatsDto;
  history: MonitorMetricsPointDto[];
}
