import type { Tone } from "@/lib/api/types";

/**
 * In-app notifications (`conventions.md` section 9, `Notification` in the spec).
 * An admin sees and marks only their own. They are kept for 90 days.
 */
export interface Notification {
  id: number;
  /** `job.finished`, `job.failed`, `task.assigned`, `note.mentioned`, `record.assigned`. */
  type: string;
  tone: Tone;
  /** In the admin's language. */
  title: string;
  message: string;
  job_id: string | null;
  resource: string | null;
  record_id?: string | null;
  task_id?: number | null;
  read_at: string | null;
  created_at: string | null;
}

export interface NotificationList {
  data: Notification[];
  meta: { page: number; per_page: number; has_more: boolean; unread_count: number };
}
