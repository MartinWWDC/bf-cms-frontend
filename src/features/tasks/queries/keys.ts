import type { TaskListParams } from "../types";

export const taskKeys = {
  all: ["tasks"] as const,
  queues: () => [...taskKeys.all, "queues"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (params: TaskListParams) => [...taskKeys.lists(), params] as const,
  types: () => [...taskKeys.all, "types"] as const,
};
