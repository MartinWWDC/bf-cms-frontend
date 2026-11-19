"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormat } from "@/i18n/use-format";
import { isMoney } from "@/lib/api/types";
import { recordHref } from "@/lib/routes";

import type { MetricColumn, MetricReference, MetricSummary, MetricTableResult } from "../types";

function isMetricReference(value: unknown): value is MetricReference {
  return typeof value === "object" && value !== null && "id" in value && "resource" in value;
}

/** A `table` metric: typed columns; a `reference` cell opens its record. */
export function MetricTable({ metric, result }: { metric: MetricSummary; result: MetricTableResult }) {
  const t = useTranslations("dashboards.chart");
  const format = useFormat();
  // The result names its columns; the metric describes them.
  const columns: MetricColumn[] = result.columns.map(
    (key) => metric.columns.find((column) => column.key === key) ?? { key, label: key, type: "text" },
  );

  if (result.rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>;

  const cell = (column: MetricColumn, value: unknown) => {
    if (value === null || value === undefined || value === "") return <span className="text-muted-foreground/60">—</span>;
    switch (column.type) {
      case "reference":
        if (!isMetricReference(value)) return String(value);
        return (
          <Link
            href={recordHref(value.resource, value.id)}
            className="underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {value.title ?? `#${value.id}`}
          </Link>
        );
      case "money":
        if (isMoney(value)) return format.money(value);
        return typeof value === "number" ? format.money({ amount: value, currency: metric.currency ?? "EUR" }) : String(value);
      case "number":
        return typeof value === "number" ? format.number(value, 2) : String(value);
      case "date":
        return format.date(String(value));
      case "datetime":
        return format.dateTime(String(value));
      default:
        return typeof value === "object" ? JSON.stringify(value) : String(value);
    }
  };

  return (
    <div className="scrollbar-slim max-h-96 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={cn((column.type === "number" || column.type === "money") && "text-right")}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    (column.type === "number" || column.type === "money") && "text-right font-mono text-[0.8125rem] tabular-nums",
                  )}
                >
                  {cell(column, row[column.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
