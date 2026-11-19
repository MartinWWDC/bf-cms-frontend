import { api, type Envelope, getData } from "@/lib/api/client";

import type {
  AdminAccess,
  AuditFilters,
  AuditList,
  DashboardOption,
  OverrideEffect,
  PermissionGroup,
  Role,
  RoleHomeDashboard,
  RoleInput,
  StaffList,
} from "../types";

/* ---------- Roles ---------- */

export function fetchRoles(): Promise<Role[]> {
  return getData<Role[]>("/roles");
}

export async function createRole(input: RoleInput): Promise<Role> {
  const response = await api.post<Envelope<Role>>("/roles", input);
  return response.data.data;
}

export async function updateRole(id: number, input: RoleInput): Promise<Role> {
  const response = await api.patch<Envelope<Role>>(`/roles/${id}`, input);
  return response.data.data;
}

export async function deleteRole(id: number): Promise<void> {
  await api.delete(`/roles/${id}`);
}

/** Every permission that can be granted, grouped by resource. */
export function fetchPermissionCatalogue(): Promise<PermissionGroup[]> {
  return getData<PermissionGroup[]>("/permissions");
}

export function fetchRoleHomeDashboard(roleId: number): Promise<RoleHomeDashboard> {
  return getData<RoleHomeDashboard>(`/roles/${roleId}/home-dashboard`);
}

/** Sets the dashboard a role opens after login; `null` clears it. Only built-in dashboards. */
export async function updateRoleHomeDashboard(roleId: number, dashboard: string | null): Promise<RoleHomeDashboard> {
  const response = await api.put<Envelope<RoleHomeDashboard>>(`/roles/${roleId}/home-dashboard`, { dashboard });
  return response.data.data;
}

/** The dashboards a home dashboard can be chosen from. */
export function fetchDashboardOptions(): Promise<DashboardOption[]> {
  return getData<DashboardOption[]>("/dashboards");
}

/* ---------- Staff ---------- */

export async function fetchStaffAccounts(params: { q: string; page: number; perPage: number }): Promise<StaffList> {
  const response = await api.get<StaffList>("/admins", {
    params: { q: params.q || undefined, page: params.page, per_page: params.perPage },
  });
  return response.data;
}

export function fetchAdminAccess(adminId: number): Promise<AdminAccess> {
  return getData<AdminAccess>(`/admins/${adminId}/access`);
}

/** Replaces the roles of a staff member. `roles` are role keys. */
export async function updateAdminRoles(adminId: number, roles: string[]): Promise<AdminAccess> {
  const response = await api.put<Envelope<AdminAccess>>(`/admins/${adminId}/roles`, { roles });
  return response.data.data;
}

/** Replaces the personal allow and deny list of a staff member. */
export async function updateAdminOverrides(
  adminId: number,
  overrides: Record<string, OverrideEffect>,
): Promise<AdminAccess> {
  const response = await api.put<Envelope<AdminAccess>>(`/admins/${adminId}/overrides`, {
    overrides: Object.entries(overrides).map(([permission, effect]) => ({ permission, effect })),
  });
  return response.data.data;
}

/** Removes the two-factor setup of a staff member, which also signs them out. */
export async function resetAdminTwoFactor(adminId: number): Promise<{ revoked_sessions: number }> {
  const response = await api.post<Envelope<{ revoked_sessions: number }>>(`/admins/${adminId}/two-factor/reset`);
  return response.data.data;
}

/* ---------- Audit ---------- */

export async function fetchAudit(filters: AuditFilters, page: number, perPage: number): Promise<AuditList> {
  const response = await api.get<AuditList>("/audit", {
    params: {
      admin_id: filters.adminId ?? undefined,
      event: filters.event || undefined,
      resource: filters.resource || undefined,
      record_id: filters.recordId || undefined,
      request_id: filters.requestId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page,
      per_page: perPage,
    },
  });
  return response.data;
}
