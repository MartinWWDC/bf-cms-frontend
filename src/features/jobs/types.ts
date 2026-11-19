/**
 * Background jobs: actions on many records, bulk assignment and exports
 * (`conventions.md` section 9, `Job` in the spec). An admin sees only their own jobs.
 */

export type JobStatus = "queued" | "running" | "finished" | "failed";

export interface JobFailure {
  id: string | number;
  code: string;
  message: string;
}

/** `result` of a bulk action or bulk assignment. */
export interface BulkJobResult {
  succeeded?: number;
  failed?: number;
  /** The first 1000 ids that succeeded. */
  succeeded_ids?: (string | number)[];
  /** The first 200 failures. */
  failures?: JobFailure[];
}

/** `result` of a finished export. */
export interface ExportJobResult {
  format?: string;
  rows?: number;
  truncated?: boolean;
  max_rows?: number;
}

export interface Job {
  id: string;
  /** `bulk_action`, `bulk_assignment` or `export`. */
  type: string;
  status: JobStatus;
  resource: string | null;
  action: string | null;
  progress: { done: number; total: number; failed: number };
  result: (BulkJobResult & ExportJobResult) | null;
  /** Why the job could not run at all, in the admin's language. */
  error: string | null;
  /** Signed link of a finished export. It works once and for 5 minutes; read the job again for a new one. */
  download_url: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export function isJobDone(job: Pick<Job, "status">) {
  return job.status === "finished" || job.status === "failed";
}
