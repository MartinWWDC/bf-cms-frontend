import type { AuditFilters } from "../types";

export const accessKeys = {
  all: ["access"] as const,
  roles: () => [...accessKeys.all, "roles"] as const,
  catalogue: () => [...accessKeys.all, "catalogue"] as const,
  homeDashboard: (roleId: number) => [...accessKeys.all, "home-dashboard", roleId] as const,
  dashboardOptions: () => [...accessKeys.all, "dashboard-options"] as const,
  staff: () => [...accessKeys.all, "staff"] as const,
  staffList: (params: { q: string; page: number; perPage: number }) => [...accessKeys.staff(), "list", params] as const,
  adminAccess: (adminId: number) => [...accessKeys.staff(), "access", adminId] as const,
  audit: () => [...accessKeys.all, "audit"] as const,
  auditList: (filters: AuditFilters, page: number, perPage: number) =>
    [...accessKeys.audit(), filters, page, perPage] as const,
};
