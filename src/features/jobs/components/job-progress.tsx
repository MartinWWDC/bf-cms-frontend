"use client";

import { DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { useFormat } from "@/i18n/use-format";
import type { Tone } from "@/lib/api/types";

import type { Job, JobStatus } from "../types";

const STATUS_TONE: Record<JobStatus, Tone> = {
  queued: "neutral",
  running: "info",
  finished: "success",
  failed: "danger",
};

/** Progress, outcome, failures and the download of one job. */
export function JobProgress({ job, compact = false }: { job: Job; compact?: boolean }) {
  const t = useTranslations("jobs");
  const format = useFormat();
  const { done, total, failed } = job.progress;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : job.status === "finished" ? 100 : 0;
  const failures = job.result?.failures ?? [];
  const hasFailures = failed > 0 || (job.result?.failed ?? 0) > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <StatusBadge
          label={t(`status.${job.status}`)}
          tone={job.status === "finished" && hasFailures ? "warning" : STATUS_TONE[job.status]}
        />
        {total > 0 ? (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {t("progress", { done: format.number(done), total: format.number(total) })}
            {failed > 0 ? ` · ${t("failedCount", { count: failed })}` : null}
          </span>
        ) : null}
      </div>

      {job.status === "queued" || job.status === "running" ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn("h-full rounded-full bg-brand transition-[width]", total === 0 && "w-1/3 animate-pulse")}
            style={total > 0 ? { width: `${percent}%` } : undefined}
          />
        </div>
      ) : null}

      {job.error ? <p className="text-sm text-destructive">{job.error}</p> : null}

      {job.status === "finished" && job.type === "export" && job.result ? (
        <p className="text-sm text-muted-foreground">
          {t("exportRows", { count: job.result.rows ?? 0 })}
          {job.result.truncated ? ` ${t("exportTruncated", { max: format.number(job.result.max_rows ?? 0) })}` : null}
        </p>
      ) : null}

      {job.download_url ? (
        <a
          href={job.download_url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}
        >
          <DownloadIcon />
          {t("download")}
        </a>
      ) : null}

      {failures.length > 0 && !compact ? (
        <ul className="scrollbar-slim max-h-48 overflow-y-auto rounded-md border bg-muted/40 text-sm">
          {failures.map((failure, index) => (
            <li key={`${failure.id}-${index}`} className="flex gap-2 border-b px-2.5 py-1.5 last:border-b-0">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">#{failure.id}</span>
              <span className="min-w-0 break-words">{failure.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {failures.length > 0 && compact ? (
        <p className="text-sm text-muted-foreground">{t("failuresHint")}</p>
      ) : null}
    </div>
  );
}
