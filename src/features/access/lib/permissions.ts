import type { PermissionGroup } from "../types";

/** The key that grants everything. */
export const ALL = "*";

/** Whether a set of granted keys covers a permission: by name, by its group's wildcard, or by `*`. */
export function covers(granted: ReadonlySet<string>, group: PermissionGroup, key: string): boolean {
  return granted.has(ALL) || granted.has(group.wildcard) || granted.has(key);
}

export function coversGroup(granted: ReadonlySet<string>, group: PermissionGroup): boolean {
  return (
    granted.has(ALL) ||
    granted.has(group.wildcard) ||
    (group.permissions.length > 0 && group.permissions.every((permission) => granted.has(permission.key)))
  );
}

export function countInGroup(granted: ReadonlySet<string>, group: PermissionGroup): number {
  return group.permissions.filter((permission) => covers(granted, group, permission.key)).length;
}

/** Replaces `*` by every group's wildcard, so that single groups can be taken away. */
function expandAll(granted: Set<string>, catalogue: PermissionGroup[]) {
  if (!granted.delete(ALL)) return;
  for (const group of catalogue) granted.add(group.wildcard);
}

/** Grants or takes a whole group. A fully granted group is stored as its wildcard. */
export function toggleGroup(
  granted: ReadonlySet<string>,
  catalogue: PermissionGroup[],
  group: PermissionGroup,
  on: boolean,
): Set<string> {
  const next = new Set(granted);
  expandAll(next, catalogue);
  next.delete(group.wildcard);
  for (const permission of group.permissions) next.delete(permission.key);
  if (on) next.add(group.wildcard);
  return next;
}

/** Grants or takes one permission. Taking one out of a wildcard keeps the others by name. */
export function togglePermission(
  granted: ReadonlySet<string>,
  catalogue: PermissionGroup[],
  group: PermissionGroup,
  key: string,
  on: boolean,
): Set<string> {
  const next = new Set(granted);
  expandAll(next, catalogue);
  if (next.delete(group.wildcard)) {
    for (const permission of group.permissions) next.add(permission.key);
  }
  if (on) next.add(key);
  else next.delete(key);
  // Every permission of the group by name is the same as its wildcard.
  if (group.permissions.every((permission) => next.has(permission.key))) {
    for (const permission of group.permissions) next.delete(permission.key);
    next.add(group.wildcard);
  }
  return next;
}

/** Catalogue narrowed to groups and permissions matching a search text. */
export function filterCatalogue(catalogue: PermissionGroup[], rawQuery: string): PermissionGroup[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return catalogue;
  const result: PermissionGroup[] = [];
  for (const group of catalogue) {
    if (group.label.toLowerCase().includes(query) || group.group.toLowerCase().includes(query)) {
      result.push(group);
      continue;
    }
    const permissions = group.permissions.filter(
      (permission) => permission.label.toLowerCase().includes(query) || permission.key.toLowerCase().includes(query),
    );
    if (permissions.length > 0) result.push({ ...group, permissions });
  }
  return result;
}

export function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  return a.size === b.size && [...a].every((entry) => b.has(entry));
}
