"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormat } from "@/i18n/use-format";

import { useAssistantUsage } from "../queries";
import type { AssistantUsageNumbers } from "../types";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Usage and cost per admin for one month (`GET /assistant/usage`, needs `assistant.usage`). */
export function UsageReport() {
  const t = useTranslations("assistant.usage");
  const format = useFormat();
  const [month, setMonth] = useState(currentMonth);
  const usage = useAssistantUsage(month, /^\d{4}-\d{2}$/.test(month));
  const usd = (value: number) => format.money({ amount: Math.round(value * 100), currency: "USD" });

  const cells = (row: AssistantUsageNumbers) => (
    <>
      <TableCell className="text-right font-mono tabular-nums">{format.number(row.messages)}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">{format.number(row.model_calls)}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">{format.number(row.tool_calls)}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">
        {format.number(row.prompt_tokens + row.completion_tokens)}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">{usd(row.cost_usd)}</TableCell>
    </>
  );

  return (
    <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assistant-usage-month">{t("month")}</Label>
          <Input
            id="assistant-usage-month"
            type="month"
            value={month}
            max={currentMonth()}
            onChange={(event) => setMonth(event.target.value)}
            className="w-44 bg-card"
          />
        </div>
        {usage.data ? (
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("monthCost")}</dt>
              <dd className="font-mono tabular-nums">
                {t("costOfLimit", {
                  cost: usd(usage.data.meta.month_cost_usd),
                  limit: usd(usage.data.meta.limits.monthly_cost_usd),
                })}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("dailyMessages")}</dt>
              <dd className="font-mono tabular-nums">{format.number(usage.data.meta.limits.daily_messages_per_admin)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("dailyTokens")}</dt>
              <dd className="font-mono tabular-nums">{format.number(usage.data.meta.limits.daily_tokens_per_admin)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("model")}</dt>
              <dd className="font-mono">{usage.data.meta.model}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      {usage.isError ? (
        <ErrorState title={t("loadFailed")} error={usage.error} onRetry={() => usage.refetch()} />
      ) : usage.isPending ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin")}</TableHead>
                <TableHead className="text-right">{t("messages")}</TableHead>
                <TableHead className="text-right">{t("modelCalls")}</TableHead>
                <TableHead className="text-right">{t("toolCalls")}</TableHead>
                <TableHead className="text-right">{t("tokens")}</TableHead>
                <TableHead className="text-right">{t("cost")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.data.data.admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                usage.data.data.admins.map((row) => (
                  <TableRow key={row.admin.id}>
                    <TableCell>{row.admin.name ?? `#${row.admin.id}`}</TableCell>
                    {cells(row)}
                  </TableRow>
                ))
              )}
            </TableBody>
            {usage.data.data.admins.length > 0 ? (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">{t("total")}</TableCell>
                  {cells(usage.data.data.totals)}
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      )}
    </div>
  );
}
