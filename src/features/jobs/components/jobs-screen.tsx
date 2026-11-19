"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat } from "@/i18n/use-format";

import { useJobs } from "../queries";
import type { Job } from "../types";
import { JobProgress } from "./job-progress";

/** The admin's background jobs, newest first: bulk actions, bulk assignments and exports. */
export function JobsScreen() {
  const t = useTranslations("jobs");
  const tTable = useTranslations("table");
  const format = useFormat();
  const [page, setPage] = useState(1);
  const jobs = useJobs(page);

  const typeLabel = (job: Job) =>
    job.type === "export" || job.type === "bulk_action" || job.type === "bulk_assignment"
      ? t(`types.${job.type}`)
      : job.type;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("title")} description={t("description")} />
      {jobs.isError ? (
        <ErrorState title={t("listLoadFailed")} error={jobs.error} onRetry={() => jobs.refetch()} />
      ) : (
        <div className="flex flex-col gap-3 px-4 pb-6 sm:px-6">
          {jobs.isPending ? (
            Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-24" />)
          ) : jobs.data.data.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            jobs.data.data.map((job) => (
              <article key={job.id} className="rounded-lg border bg-card p-4">
                <header className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-sm font-medium">{typeLabel(job)}</h2>
                  {job.resource ? <span className="font-mono text-xs text-muted-foreground">{job.resource}</span> : null}
                  {job.action ? <span className="font-mono text-xs text-muted-foreground">{job.action}</span> : null}
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {job.created_at ? format.dateTime(job.created_at) : null} · {job.id}
                  </span>
                </header>
                <JobProgress job={job} />
              </article>
            ))
          )}
          {jobs.data && (page > 1 || jobs.data.meta.has_more) ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {tTable("previousPage")}
              </Button>
              <Button variant="outline" size="sm" disabled={!jobs.data.meta.has_more} onClick={() => setPage(page + 1)}>
                {tTable("nextPage")}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
