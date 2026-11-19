export const warehouseKeys = {
  all: ["warehouse"] as const,
  scan: (code: string) => [...warehouseKeys.all, "scan", code] as const,
  labels: (codes: string[]) => [...warehouseKeys.all, "labels", codes] as const,
};
