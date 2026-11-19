import { api, type Envelope, getData } from "@/lib/api/client";

import type {
  Dashboard,
  DashboardInput,
  DashboardLayout,
  DashboardList,
  MetricParams,
  MetricSummary,
  MetricValue,
} from "../types";

/** `range`, `from`, `to`, `compare` and `filters[key]=value`, as the API takes them. */
function toQuery(params: MetricParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.range) query.range = params.range;
  if (params.range === "custom") {
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
  }
  if (params.compare === false) query.compare = "false";
  for (const [key, value] of Object.entries(params.filters ?? {})) {
    if (value) query[`filters[${key}]`] = value;
  }
  return query;
}

/** The dashboards this admin may open, and the home dashboard in `meta.home`. */
export async function fetchDashboards(): Promise<DashboardList> {
  const response = await api.get<DashboardList>("/dashboards");
  return response.data;
}

/** One dashboard with the values of all its cards. */
export function fetchDashboard(key: string, params: MetricParams): Promise<Dashboard> {
  return getData<Dashboard>(`/dashboards/${key}`, { params: toQuery(params) });
}

/** Every metric this admin may see, for the personal dashboard editor. */
export function fetchMetrics(): Promise<MetricSummary[]> {
  return getData<MetricSummary[]>("/metrics");
}

export function fetchMetric(metric: string, params: MetricParams): Promise<MetricValue> {
  return getData<MetricValue>(`/metrics/${metric}`, { params: toQuery(params) });
}

/** The data behind a metric as a CSV file. Needs the bearer token, so it is fetched, not linked. */
export async function exportMetric(metric: string, params: MetricParams): Promise<{ blob: Blob; name: string }> {
  const response = await api.get<Blob>(`/metrics/${metric}/export`, { params: toQuery(params), responseType: "blob" });
  const disposition = String(response.headers["content-disposition"] ?? "");
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1];
  return { blob: response.data, name: name ? decodeURIComponent(name) : `${metric}.csv` };
}

export async function createDashboard(input: DashboardInput): Promise<DashboardLayout> {
  const response = await api.post<Envelope<DashboardLayout>>("/dashboards", input);
  return response.data.data;
}

/** Only personal dashboards can be changed; a built-in one answers `405`. */
export async function updateDashboard(key: string, input: Partial<DashboardInput>): Promise<DashboardLayout> {
  const response = await api.patch<Envelope<DashboardLayout>>(`/dashboards/${key}`, input);
  return response.data.data;
}

export async function deleteDashboard(key: string): Promise<void> {
  await api.delete(`/dashboards/${key}`);
}
