import type { Tone } from "@/lib/api/types";

/**
 * Sidebar navigation, `GET /navigation` (`field-types.md` section 8, `NavigationNode` in
 * the spec). The tree is already filtered to what the admin may see and its labels are in
 * the admin's language. It is also the route guard: a page that is not in it is a
 * "no access" page.
 */

interface NodeBase {
  key: string;
  label: string;
  /** Icon name of the backend, mapped in `lib/nav-icons.ts`. */
  icon?: string | null;
  /** Extra words the menu search matches besides the label. */
  keywords: string[];
}

export interface NavSavedView {
  id: number;
  name: string;
  is_default: boolean;
}

/** A collapsible section. Can hold groups, views and pages, to any depth. */
export interface NavGroupNode extends NodeBase {
  type: "group";
  children: NavNode[];
}

/** Opens a built-in view of a resource. */
export interface NavViewNode extends NodeBase {
  type: "view";
  permission?: string | null;
  resource: string;
  view: string;
  /** `null`, or the tone of the count loaded from `GET /navigation/badges`. */
  badge?: { tone: Tone } | null;
  /** The admin's saved views, on the resource's main entry. */
  saved_views?: NavSavedView[];
}

/** Opens a fixed screen: `roles`, `staff`, `audit`, `tasks`, `dashboards/{key}`. */
export interface NavPageNode extends NodeBase {
  type: "page";
  permission?: string | null;
  page: string;
}

export type NavNode = NavGroupNode | NavViewNode | NavPageNode;
export type NavLeafNode = NavViewNode | NavPageNode;

/** Counts by node key. `capped` means a big resource stopped counting: show a plus. */
export type NavBadges = Record<string, { count: number; capped: boolean }>;
