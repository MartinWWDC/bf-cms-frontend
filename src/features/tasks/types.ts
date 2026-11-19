import type { Tone } from "@/lib/api/types";

/**
 * "My tasks" (`conventions.md` section 16; `MyTasks`, `TaskQueue`, `Task` in the spec).
 * Two parts: queues (saved filters on a resource with a live count) and stored tasks (one
 * row per event that needs a person, assigned and tracked until done).
 */

export interface StaffRef {
  id: number;
  name: string | null;
}

export interface TaskQueue {
  key: string;
  label: string;
  description: string | null;
  resource: string;
  resource_label: string;
  tone: Tone;
  icon: string | null;
  pinned: boolean;
  hidden: boolean;
  /** `all` is capped like list totals; `mine` is `null` when the resource has no assignment. */
  count: { all: number | null; all_capped: boolean; mine: number | null };
  /** The filter to open the resource list with. */
  filter: unknown;
  /** The same filter limited to the admin's records; `null` without assignment. */
  mine_filter: unknown;
}

export interface TaskCounts {
  mine: { open: number; in_progress: number; overdue: number };
  unassigned: number;
  /** `null` without `tasks.view_all`. */
  all: number | null;
  by_type: { type: string; label: string; mine: number; unassigned: number; all: number | null }[];
}

export interface MyTasks {
  queues: TaskQueue[];
  tasks: TaskCounts;
}

export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "open" | "in_progress" | "done" | "dismissed";
/** Statuses an admin can set; dismissing has its own endpoint. */
export type SettableTaskStatus = "open" | "in_progress" | "done";
export type TaskScope = "mine" | "unassigned" | "all";
export type TaskSort = "priority" | "due_at" | "created_at" | "-created_at";

export interface Task {
  id: number;
  type: string;
  type_label: string;
  title: string;
  priority: TaskPriority;
  priority_tone: Tone;
  status: TaskStatus;
  status_tone: Tone;
  /** Open the record with `resource` + `record_id`. */
  resource: string;
  resource_label: string;
  record_id: string;
  record_title: string | null;
  assignee: StaffRef | null;
  assigned_at: string | null;
  due_at: string | null;
  overdue: boolean;
  closed_by: StaffRef | null;
  closed_at: string | null;
  close_reason: string | null;
  closed_automatically: boolean;
  created_at: string | null;
  updated_at: string | null;
  abilities: { take: boolean; change: boolean; assign_others: boolean };
}

export interface TaskType {
  type: string;
  label: string;
  resource: string;
  priority: TaskPriority;
}

export interface TaskListParams {
  scope: TaskScope;
  /** Empty means open and in progress. */
  status: TaskStatus[];
  type: string | null;
  priority: TaskPriority[];
  overdue: boolean;
  sort: TaskSort | null;
  page: number;
  perPage: number;
}

export interface TaskList {
  data: Task[];
  meta: { page: number; per_page: number; total: number; has_more: boolean };
}

/** One change to a task, or to many at once. */
export type TaskOperation =
  | { operation: "take" }
  | { operation: "assign"; adminId: number | null }
  | { operation: "status"; status: SettableTaskStatus; reason?: string }
  | { operation: "dismiss"; reason: string };

export interface BulkTaskResult {
  succeeded: number[];
  failed: { id: number; code: string; message: string }[];
}

export const TASK_PRIORITIES: readonly TaskPriority[] = ["urgent", "high", "normal", "low"];
export const TASK_STATUSES: readonly TaskStatus[] = ["open", "in_progress", "done", "dismissed"];
export const TASK_SORTS: readonly TaskSort[] = ["priority", "due_at", "-created_at", "created_at"];
/** The API takes at most 200 ids in one bulk request. */
export const MAX_BULK_TASKS = 200;
