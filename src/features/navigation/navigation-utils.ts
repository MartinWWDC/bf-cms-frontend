import type { NavGroup, NavItem } from "./types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function itemMatches(item: NavItem, query: string) {
  return (
    item.label.toLowerCase().includes(query) ||
    (item.keywords?.some((keyword) => keyword.toLowerCase().includes(query)) ?? false)
  );
}

/**
 * Narrow the navigation to entries matching a search query.
 * A matching group label keeps the whole group; a matching parent keeps all its children;
 * a matching child keeps its parent with only the matching children.
 */
export function filterNavigation(groups: NavGroup[], rawQuery: string): NavGroup[] {
  const query = normalize(rawQuery);
  if (!query) return groups;

  const result: NavGroup[] = [];
  for (const group of groups) {
    if (group.label.toLowerCase().includes(query)) {
      result.push(group);
      continue;
    }
    const items: NavItem[] = [];
    for (const item of group.items) {
      if (itemMatches(item, query)) {
        items.push(item);
        continue;
      }
      const children = item.children?.filter((child) => itemMatches(child, query));
      if (children?.length) items.push({ ...item, children });
    }
    if (items.length) result.push({ ...group, items });
  }
  return result;
}

export function isHrefActive(href: string | undefined, pathname: string) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isItemActive(item: NavItem, pathname: string): boolean {
  return (
    isHrefActive(item.href, pathname) ||
    (item.children?.some((child) => isItemActive(child, pathname)) ?? false)
  );
}

/** Label of the navigation entry for a pathname, used as a page title fallback. */
export function findNavLabel(groups: NavGroup[], pathname: string): string | undefined {
  for (const group of groups) {
    for (const item of group.items) {
      const child = item.children?.find((entry) => isHrefActive(entry.href, pathname));
      if (child) return child.label;
      if (isHrefActive(item.href, pathname)) return item.label;
    }
  }
  return undefined;
}
