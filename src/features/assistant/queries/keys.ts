export const assistantKeys = {
  all: ["assistant"] as const,
  status: () => [...assistantKeys.all, "status"] as const,
  conversations: () => [...assistantKeys.all, "conversations"] as const,
  conversation: (id: number) => [...assistantKeys.all, "conversation", id] as const,
  usage: (month: string) => [...assistantKeys.all, "usage", month] as const,
};
