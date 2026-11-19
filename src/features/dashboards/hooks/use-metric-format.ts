"use client";

import { useCallback } from "react";

import { useFormat } from "@/i18n/use-format";

import type { MetricSummary } from "../types";

/**
 * Formats a metric's numbers by its `format`: a plain number, a percentage (the value is
 * already one: `12.5` means 12.5 %) or money (cents in the metric's `currency`).
 */
export function useMetricFormat(metric: Pick<MetricSummary, "format" | "currency">) {
  const format = useFormat();
  const { format: kind, currency } = metric;

  return useCallback(
    (value: number | null | undefined): string => {
      if (value === null || value === undefined) return "—";
      if (kind === "money") return format.money({ amount: value, currency: currency ?? "EUR" });
      if (kind === "percent") return format.percent(value);
      return format.number(value, 2);
    },
    [format, kind, currency],
  );
}
