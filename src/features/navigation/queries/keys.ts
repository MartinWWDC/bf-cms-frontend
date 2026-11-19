export const navigationKeys = {
  all: ["navigation"] as const,
  tree: () => [...navigationKeys.all, "tree"] as const,
  badges: () => [...navigationKeys.all, "badges"] as const,
};
