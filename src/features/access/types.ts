import type { PageMeta } from "@/lib/api/types";

/**
 * Roles, staff access and the audit trail.
 * Shapes from `cms/docs/openapi.json` (`Role`, `RoleInput`, `AdminAccess`, `AdminListItem`,
 * `AuditEntry`, `DashboardSummary`), `PermissionCatalogueQuery` on the backend and
 * `conventions.md` sections 4, 7 and 10.
 */

/** A role. Roles are made by admins; only the super admin role is built in (`is_system`). */
export interface Role {
  id: number;
  /** Stable key, used when roles are assigned to staff. */
  key: string;
  name: string;
  description: string | null;
  /** Admins with this role pass every check. Only a super admin may set or change it. */
  is_super: boolean;
  /** Built in; cannot be deleted. */
  is_system: boolean;
  /** Granted keys. `resource.*` covers a resource, `*` everything. */
  permissions: string[];
  admins_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface RoleInput {
  name?: string;
  description?: string | null;
  permissions?: string[];
  is_super?: boolean;
}

/** One group of the permission catalogue (`GET /permissions`), usually one resource. */
export interface PermissionGroup {
  group: string;
  label: string;
  /** The key that grants every permission of the group: `colors.*`. */
  wildcard: string;
  permissions: { key: string; label: string }[];
}

export interface RoleHomeDashboard {
  role_id: number;
  /** Key of a built-in dashboard, or `null`. */
  dashboard: string | null;
}

/** A dashboard a role can open after login. Only built-in ones can be a home dashboard. */
export interface DashboardOption {
  key: string;
  type: "built_in" | "personal";
  id: number | null;
  label: string;
  icon: string | null;
}

export interface StaffAccount {
  id: number;
  name: string | null;
  email: string;
  /** Role keys. */
  roles: string[];
  two_factor_enabled: boolean;
  created_at: string | null;
}

export interface StaffListMeta {
  page: number;
  per_page: number;
  total: number;
  total_capped: boolean;
  has_more: boolean;
}

export interface StaffList {
  data: StaffAccount[];
  meta: StaffListMeta;
}

export type OverrideEffect = "allow" | "deny";

/** Where an effective permission comes from. */
export type PermissionSource = "super" | "deny" | "allow" | "role" | "none";

export interface EffectivePermission {
  permission: string;
  label: string;
  group: string;
  allowed: boolean;
  source: PermissionSource | string;
}

/** The access of one staff member, `GET /admins/{id}/access`. */
export interface AdminAccess {
  admin: { id: number; name: string; email: string };
  /** Role keys. */
  roles: string[];
  is_super_admin: boolean;
  /** Personal allow and deny settings by permission key. Always an object, `{}` when empty. */
  overrides: Record<string, OverrideEffect>;
  /** Every permission with whether this admin has it. Resolution: deny, allow, any role, else denied. */
  effective: EffectivePermission[];
}

export interface AuditEntry {
  id: number;
  event: string;
  /** Translated by the backend. */
  event_label: string;
  admin: { id: number; name: string | null } | null;
  /** `null` for entries that belong to no record, such as sign-ins and access changes. */
  resource: string | null;
  record_id: string | null;
  /** A sensitive field shows `"[hidden]"` for both sides. */
  changes: Record<string, { old: unknown; new: unknown }>;
  meta: Record<string, unknown>;
  reason: string | null;
  created_at: string;
  request_id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
}

export interface AuditFilters {
  adminId?: number | null;
  event?: string | null;
  resource?: string | null;
  recordId?: string | null;
  requestId?: string | null;
  /** A date (`2026-11-01`) or a date with time. */
  from?: string | null;
  to?: string | null;
}

export interface AuditList {
  data: AuditEntry[];
  meta: PageMeta;
}

/** Events `GET /audit` accepts in `event=`, from the spec. An event added later still shows by its label. */
export const AUDIT_EVENTS = [
  "record.created",
  "record.updated",
  "record.deleted",
  "record.restored",
  "action.run",
  "action.queued",
  "sensitive.revealed",
  "export.requested",
  "export.downloaded",
  "note.added",
  "note.updated",
  "note.deleted",
  "note.pinned",
  "note.unpinned",
  "assignment.assigned",
  "assignment.unassigned",
  "assignment.bulk_queued",
  "task.taken",
  "task.assigned",
  "task.status_changed",
  "task.dismissed",
  "account.task_queue_changed",
  "assistant.conversation_started",
  "assistant.message_sent",
  "assistant.tool_called",
  "assistant.conversation_deleted",
  "auth.login",
  "auth.logout",
  "auth.session_revoked",
  "auth.two_factor_enrolled",
  "auth.two_factor_reset",
  "auth.recovery_codes_regenerated",
  "account.language_changed",
  "account.view_saved",
  "account.view_deleted",
  "account.dashboard_saved",
  "account.dashboard_deleted",
  "access.role_created",
  "access.role_updated",
  "access.role_deleted",
  "access.roles_assigned",
  "access.overrides_changed",
] as const;
