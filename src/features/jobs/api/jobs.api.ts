import { getData, getEnvelope } from "@/lib/api/client";
import type { PageMeta } from "@/lib/api/types";

import type { Job } from "../types";

export function fetchJobs(page: number) {
  return getEnvelope<Job[], PageMeta>("/jobs", { params: { page, per_page: 25 } });
}

export function fetchJob(id: string): Promise<Job> {
  return getData<Job>(`/jobs/${id}`);
}
