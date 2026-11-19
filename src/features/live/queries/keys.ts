export const liveKeys = {
  all: ["live"] as const,
  settings: () => [...liveKeys.all, "settings"] as const,
};
