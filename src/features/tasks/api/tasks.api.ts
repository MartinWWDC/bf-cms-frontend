import { api, type Envelope, getData } from "@/lib/api/client";

import type { BulkTaskResult, MyTasks, Task, TaskList, TaskListParams, TaskOperation, TaskQueue, TaskType } from "../types";

export function fetchTaskQueues(): Promise<MyTasks> {
  return getData<MyTasks>("/tasks/queues");
}

/** Pins or hides a queue for this admin. Personal and audited. */
export async function updateQueuePreference(
  queue: string,
  preference: { pinned?: boolean; hidden?: boolean },
): Promise<TaskQueue> {
  const response = await api.put<Envelope<TaskQueue>>(`/tasks/queues/${queue}/preference`, preference);
  return response.data.data;
}

export async function fetchTasks(params: TaskListParams): Promise<TaskList> {
  const response = await api.get<TaskList>("/tasks", {
    params: {
      scope: params.scope,
      status: params.status.length ? params.status.join(",") : undefined,
      type: params.type ?? undefined,
      priority: params.priority.length ? params.priority.join(",") : undefined,
      overdue: params.overdue ? 1 : undefined,
      sort: params.sort ?? undefined,
      page: params.page,
      per_page: params.perPage,
    },
  });
  return response.data;
}

export function fetchTaskTypes(): Promise<TaskType[]> {
  return getData<TaskType[]>("/tasks/types");
}

/** Take, assign, set the status of or dismiss one task. */
export async function changeTask(id: number, change: TaskOperation): Promise<Task> {
  const path = `/tasks/${id}/${change.operation}`;
  const body =
    change.operation === "take"
      ? {}
      : change.operation === "assign"
        ? { admin_id: change.adminId }
        : change.operation === "status"
          ? { status: change.status, _reason: change.reason || undefined }
          : { reason: change.reason };
  const response = await api.post<Envelope<Task>>(path, body);
  return response.data.data;
}

/** The same on many tasks (at most 200). Each task succeeds or fails on its own. */
export async function changeTasks(ids: number[], change: TaskOperation): Promise<BulkTaskResult> {
  const response = await api.post<Envelope<BulkTaskResult>>("/tasks/bulk", {
    operation: change.operation,
    ids,
    ...(change.operation === "assign" ? { admin_id: change.adminId } : {}),
    ...(change.operation === "status" ? { status: change.status, reason: change.reason || undefined } : {}),
    ...(change.operation === "dismiss" ? { reason: change.reason } : {}),
  });
  return response.data.data;
}
