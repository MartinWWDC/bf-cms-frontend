export const sessionKeys = {
  all: ["session"] as const,
  me: () => [...sessionKeys.all, "me"] as const,
  sessions: () => [...sessionKeys.all, "sessions"] as const,
};
