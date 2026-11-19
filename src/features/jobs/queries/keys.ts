export const jobKeys = {
  all: ["jobs"] as const,
  list: (page: number) => [...jobKeys.all, "list", page] as const,
  detail: (id: string) => [...jobKeys.all, "detail", id] as const,
};
