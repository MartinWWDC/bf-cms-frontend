import type { MetricParams } from "../types";

export const dashboardKeys = {
  all: ["dashboards"] as const,
  list: () => [...dashboardKeys.all, "list"] as const,
  details: () => [...dashboardKeys.all, "detail"] as const,
  detail: (key: string, params: MetricParams) => [...dashboardKeys.details(), key, params] as const,
  metrics: () => [...dashboardKeys.all, "metrics"] as const,
};
