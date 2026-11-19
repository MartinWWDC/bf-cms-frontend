export const docsKeys = {
  all: ["docs"] as const,
  list: () => [...docsKeys.all, "list"] as const,
  document: (name: string) => [...docsKeys.all, "document", name] as const,
};
