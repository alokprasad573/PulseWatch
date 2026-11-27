import {
  ApiResponse,
  AuthTokens,
  CreateMonitorInput,
  DashboardSummaryDto,
  IncidentDto,
  MonitorAnalyticsDto,
  MonitorCheckDto,
  MonitorChecksSort,
  MonitorDto,
  MonitorMetricsRange,
  PaginationMeta,
  UpdateMonitorInput,
  UserDto,
} from '@pulsewatch/shared';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1').replace(/\/+$/, '');

let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('pw_access_token', token);
    } else {
      sessionStorage.removeItem('pw_access_token');
    }
  }
}

export function getAccessToken(): string | null {
  if (!currentAccessToken && typeof window !== 'undefined') {
    currentAccessToken = sessionStorage.getItem('pw_access_token');
  }
  return currentAccessToken;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // send HttpOnly cookies for refresh
  });

  // If 401 Unauthorized, try refresh once
  if (
    response.status === 401 &&
    !endpoint.startsWith('/auth/login') &&
    !endpoint.startsWith('/auth/refresh') &&
    !endpoint.startsWith('/auth/register')
  ) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData.data.accessToken;
        setAccessToken(newToken);
        headers.set('Authorization', `Bearer ${newToken}`);

        const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
        const retryData = await retryRes.json();
        if (!retryRes.ok) {
          throw new Error(retryData.message || `Request failed with status ${retryRes.status}`);
        }
        return retryData;
      } else {
        setAccessToken(null);
      }
    } catch (err) {
      setAccessToken(null);
      if (err instanceof Error && err.message !== 'Failed to fetch') {
        throw err;
      }
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

// API Methods
export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string }) =>
      apiRequest<AuthTokens>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      apiRequest<AuthTokens>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    refresh: () =>
      apiRequest<AuthTokens>('/auth/refresh', { method: 'POST' }),
    logout: () =>
      apiRequest('/auth/logout', { method: 'POST' }),
    me: () =>
      apiRequest<UserDto>('/auth/me'),
  },
  dashboard: {
    getSummary: () =>
      apiRequest<DashboardSummaryDto>('/dashboard/summary'),
  },
  monitors: {
    list: (page = 1, limit = 20) =>
      apiRequest<MonitorDto[]>(`/monitors?page=${page}&limit=${limit}`),
    get: (id: string) =>
      apiRequest<MonitorDto>(`/monitors/${id}`),
    create: (data: CreateMonitorInput) =>
      apiRequest<MonitorDto>('/monitors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateMonitorInput) =>
      apiRequest<MonitorDto>(`/monitors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    enable: (id: string) =>
      apiRequest<MonitorDto>(`/monitors/${id}/enable`, { method: 'PATCH' }),
    disable: (id: string) =>
      apiRequest<MonitorDto>(`/monitors/${id}/disable`, { method: 'PATCH' }),
    delete: (id: string) =>
      apiRequest(`/monitors/${id}`, { method: 'DELETE' }),
    getChecks: (
      id: string,
      params: { page?: number; limit?: number; sort?: MonitorChecksSort } = {},
    ) => {
      const search = new URLSearchParams();
      if (params.page !== undefined) search.set('page', String(params.page));
      if (params.limit !== undefined) search.set('limit', String(params.limit));
      if (params.sort !== undefined) search.set('sort', params.sort);
      const qs = search.toString();
      return apiRequest<MonitorCheckDto[]>(`/monitors/${id}/checks${qs ? `?${qs}` : ''}`);
    },
    getMetrics: (id: string, range: MonitorMetricsRange = '1d') =>
      apiRequest<MonitorAnalyticsDto>(
        `/monitors/${id}/metrics?range=${encodeURIComponent(range)}`,
      ),
  },
  incidents: {
    list: (page = 1, limit = 20, status?: string) =>
      apiRequest<IncidentDto[]>(`/incidents?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`),
    get: (id: string) =>
      apiRequest<IncidentDto>(`/incidents/${id}`),
  },
};
