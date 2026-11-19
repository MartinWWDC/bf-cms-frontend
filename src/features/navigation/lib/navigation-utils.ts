import { pageHref, resourceHref } from "@/lib/routes";

import type { NavLeafNode, NavNode } from "../types";

export function nodeHref(node: NavLeafNode): string {
  return node.type === "view" ? resourceHref(node.resource, node.view) : pageHref(node.page);
}

function matches(node: NavNode, query: string) {
  return (
    node.label.toLowerCase().includes(query) ||
    node.keywords.some((keyword) => keyword.toLowerCase().includes(query)) ||
    (node.type === "view" && (node.saved_views?.some((view) => view.name.toLowerCase().includes(query)) ?? false))
  );
}

/**
 * Narrow the navigation to entries matching a search query.
 * A matching group keeps everything in it; otherwise it keeps only its matching descendants.
 */
export function filterNavigation(nodes: NavNode[], rawQuery: string): NavNode[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return nodes;

  const result: NavNode[] = [];
  for (const node of nodes) {
    if (matches(node, query)) {
      result.push(node);
    } else if (node.type === "group") {
      const children = filterNavigation(node.children, query);
      if (children.length) result.push({ ...node, children });
    }
  }
  return result;
}

/** Every view and page of the tree, in display order. */
export function flattenLeaves(nodes: NavNode[]): NavLeafNode[] {
  return nodes.flatMap((node) => (node.type === "group" ? flattenLeaves(node.children) : [node]));
}

export function isHrefActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The entry the current path belongs to. A resource opened without a view in the path
 * (`/r/checkouts`) belongs to that resource's main entry.
 */
export function findActiveLeaf(nodes: NavNode[], pathname: string): NavLeafNode | undefined {
  const leaves = flattenLeaves(nodes);
  const exact = leaves.find((leaf) => isHrefActive(nodeHref(leaf), pathname));
  if (exact) return exact;
  const resource = /^\/r\/([^/]+)$/.exec(pathname)?.[1];
  return resource ? leaves.find((leaf) => leaf.type === "view" && leaf.resource === resource) : undefined;
}

export function containsLeaf(node: NavNode, key: string | undefined): boolean {
  if (!key) return false;
  return node.type === "group" ? node.children.some((child) => containsLeaf(child, key)) : node.key === key;
}

/** Route guard: may this admin open the list of a resource? */
export function canOpenResource(nodes: NavNode[], resource: string): boolean {
  return flattenLeaves(nodes).some((leaf) => leaf.type === "view" && leaf.resource === resource);
}

/** Route guard: may this admin open a fixed page? `prefix` also accepts `dashboards/…`. */
export function canOpenPage(nodes: NavNode[], page: string, prefix = false): boolean {
  return flattenLeaves(nodes).some(
    (leaf) => leaf.type === "page" && (leaf.page === page || (prefix && leaf.page.startsWith(`${page}/`))),
  );
}

export function firstLeafHref(nodes: NavNode[]): string | undefined {
  const first = flattenLeaves(nodes)[0];
  return first ? nodeHref(first) : undefined;
}
