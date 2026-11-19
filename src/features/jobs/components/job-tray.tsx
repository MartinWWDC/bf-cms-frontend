"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { navigationKeys } from "@/features/navigation/queries";
import { resourceKeys } from "@/features/resources/queries";
import { routes } from "@/lib/routes";

import { dismissJob, type TrackedJob, useTrackedJobs } from "../hooks";
import { useJob } from "../queries";
import { isJobDone } from "../types";
import { JobProgress } from "./job-progress";

/**
 * Floating list of the jobs started in this tab, with live progress. A finished export
 * offers its download here; a finished bulk action refreshes the lists it changed.
 */
export function JobTray() {
  const jobs = useTrackedJobs();
  const t = useTranslations("jobs");

  if (jobs.length === 0) return null;

  return (
    <section
      aria-label={t("trayLabel")}
      className="fixed right-4 bottom-4 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {jobs.slice(0, 4).map((job) => (
        <TrackedJobCard key={job.id} tracked={job} />
      ))}
      {jobs.length > 4 ? (
        <Link href={routes.jobs} className="self-end text-xs text-muted-foreground underline underline-offset-4">
          {t("moreJobs", { count: jobs.length - 4 })}
        </Link>
      ) : null}
    </section>
  );
}

function TrackedJobCard({ tracked }: { tracked: TrackedJob }) {
  const t = useTranslations("jobs");
  const queryClient = useQueryClient();
  const job = useJob(tracked.id);
  const status = job.data?.status;
  const resource = job.data?.resource;
  const type = job.data?.type;
  const refreshed = useRef(false);

  // The job changed records: show the new state in every list and record of its resource.
  useEffect(() => {
    if (refreshed.current || !status || !isJobDone({ status }) || type === "export" || !resource) return;
    refreshed.current = true;
    void queryClient.invalidateQueries({ queryKey: resourceKeys.all(resource) });
    void queryClient.invalidateQueries({ queryKey: navigationKeys.badges() });
  }, [status, type, resource, queryClient]);

  return (
    <div className="rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10">
      <div className="mb-2 flex items-start gap-2">
        <p className="min-w-0 flex-1 font-medium break-words">{tracked.label}</p>
        <button
          type="button"
          aria-label={t("dismiss")}
          onClick={() => dismissJob(tracked.id)}
          className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
      {job.data ? (
        <JobProgress job={job.data} compact />
      ) : job.isError ? (
        <p className="text-destructive">{t("loadFailed")}</p>
      ) : (
        <Skeleton className="h-5" />
      )}
      {job.data && (job.data.result?.failures?.length ?? 0) > 0 ? (
        <Link href={routes.jobs} className="mt-2 inline-block text-xs underline underline-offset-4">
          {t("openJobs")}
        </Link>
      ) : null}
    </div>
  );
}
