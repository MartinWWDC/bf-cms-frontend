export const searchKeys = {
  all: ["search"] as const,
  query: (query: string) => [...searchKeys.all, query] as const,
};
