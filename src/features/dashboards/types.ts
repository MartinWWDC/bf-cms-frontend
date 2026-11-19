import type { RecordId } from "@/lib/api/types";

/**
 * Dashboards and metrics (`conventions.md` section 15, `field-types.md` section 9;
 * `Dashboard`, `DashboardLayout`, `DashboardSummary`, `MetricSummary`, `MetricValue` and
 * the four result schemas in the spec).
 */

export type MetricRangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "60d"
  | "90d"
  | "365d"
  | "mtd"
  | "qtd"
  | "ytd"
  | "all"
  | "custom"
  | "now";

export type MetricType = "value" | "trend" | "breakdown" | "table";
export type MetricFormat = "number" | "percent" | "money";

export interface MetricFilter {
  key: string;
  label: string;
  /** `select` lists its options; `country` takes an ISO country code. */
  type: "select" | "country";
  options: { value: string; label: string }[];
}

export interface MetricColumn {
  key: string;
  label: string;
  type: "text" | "number" | "money" | "date" | "datetime" | "reference";
}

/** The description of a metric. */
export interface MetricSummary {
  key: string;
  label: string;
  description: string | null;
  type: MetricType;
  /** `percent`: the value is already a percentage. `money`: cents in `currency`. */
  format: MetricFormat;
  currency: string | null;
  /** Shows the state right now: no ranges, no comparison. */
  snapshot: boolean;
  ranges: MetricRangeKey[];
  default_range: MetricRangeKey;
  comparable: boolean;
  filters: MetricFilter[];
  /** Only filled for `table` metrics. */
  columns: MetricColumn[];
  /** Calculated in the background: its value can come back `pending` first. */
  heavy: boolean;
  exportable: boolean;
}

/** Opens the records behind a number: the list of `resource` with exactly this view, tab and filter. */
export interface MetricLink {
  resource: string;
  view: string | null;
  tab: string | null;
  filter: Record<string, unknown> | null;
}

export interface MetricRange {
  key: MetricRangeKey;
  from: string | null;
  to: string | null;
  previous_from: string | null;
  previous_to: string | null;
  unit: "day" | "week" | "month" | null;
  timezone: string;
}

export interface MetricValueResult {
  type: "value";
  value: number | null;
  previous: number | null;
  /** Change against the previous period in percent; `null` when there is no comparison. */
  change: number | null;
}

export interface TrendPoint {
  /** First day of the period. */
  period: string;
  value: number;
}

export interface MetricTrendResult {
  type: "trend";
  unit: "day" | "week" | "month";
  series: TrendPoint[];
  total: number;
  latest: number | null;
  previous_series: TrendPoint[] | null;
  previous_total: number | null;
  change: number | null;
}

export interface BreakdownGroup {
  /** An empty key is labelled "(none)" by the backend. */
  key: string;
  label: string;
  value: number;
  /** Share of the total in percent. */
  share: number;
  previous: number | null;
  link: MetricLink | null;
}

export interface MetricBreakdownResult {
  type: "breakdown";
  groups: BreakdownGroup[];
  total: number;
  previous_total: number | null;
  change: number | null;
}

export interface MetricReference {
  id: RecordId;
  resource: string;
  title: string | null;
}

export interface MetricTableResult {
  type: "table";
  columns: string[];
  rows: Record<string, unknown>[];
}

export type MetricResult = MetricValueResult | MetricTrendResult | MetricBreakdownResult | MetricTableResult;

/** What `GET /metrics/{metric}` and every dashboard card return. */
export interface MetricValue {
  metric: string;
  /** `pending` (heavy metrics only) has `result: null`: ask again after a few seconds. */
  status: "ready" | "pending";
  range: MetricRange;
  filters: Record<string, string>;
  result: MetricResult | null;
  link: MetricLink | null;
  calculated_at: string | null;
  calculation_ms: number | null;
  cached: boolean;
}

export interface DashboardSummary {
  /** Built-in key, or `personal_{id}`. */
  key: string;
  type: "built_in" | "personal";
  id: number | null;
  label: string;
  icon: string | null;
}

export interface DashboardList {
  data: DashboardSummary[];
  /** Key of the dashboard to show after login, `null` when there is none. */
  meta: { home: string | null };
}

export interface DashboardCard {
  metric: MetricSummary;
  /** 1 to 4 columns of a 4-column grid. */
  width: number;
  value: MetricValue | null;
  /** Set when this card failed to calculate; the other cards still show. */
  error: { code: string; message: string } | null;
}

export interface Dashboard extends DashboardSummary {
  ranges: MetricRangeKey[];
  /** Every filter any of the cards takes. */
  filters: MetricFilter[];
  cards: DashboardCard[];
}

/** Answer of saving a personal dashboard. */
export interface DashboardLayout extends DashboardSummary {
  cards: { metric: string; width: number }[];
}

export interface DashboardInput {
  name: string;
  icon?: string | null;
  cards: { metric: string; width: number }[];
}

/** One range and one set of filters apply to every card of a dashboard. */
export interface MetricParams {
  range?: MetricRangeKey | null;
  /** Dates (both included), only with `range: "custom"`. */
  from?: string | null;
  to?: string | null;
  /** `false` skips the previous period. */
  compare?: boolean;
  filters?: Record<string, string>;
}

export const MAX_DASHBOARD_CARDS = 40;
