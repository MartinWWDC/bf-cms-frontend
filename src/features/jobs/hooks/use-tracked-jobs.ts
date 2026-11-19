"use client";

import { useSyncExternalStore } from "react";

/**
 * Jobs started in this tab that the admin is waiting for. They are shown in the job tray
 * until dismissed. Kept in memory only: the Jobs page lists every job in any case.
 */

export interface TrackedJob {
  id: string;
  /** What was started, in the admin's words: "Export Checkouts", "Refund on 12 records". */
  label: string;
}

let tracked: TrackedJob[] = [];
const listeners = new Set<() => void>();
const EMPTY: TrackedJob[] = [];

function emit() {
  for (const listener of listeners) listener();
}

/** Start showing a queued job's progress. Callable from anywhere, also outside React. */
export function trackJob(job: TrackedJob) {
  if (tracked.some((entry) => entry.id === job.id)) return;
  tracked = [job, ...tracked];
  emit();
}

export function dismissJob(id: string) {
  tracked = tracked.filter((entry) => entry.id !== id);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTrackedJobs(): TrackedJob[] {
  return useSyncExternalStore(
    subscribe,
    () => tracked,
    () => EMPTY,
  );
}
