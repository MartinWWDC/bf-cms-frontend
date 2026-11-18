/**
 * Sidebar navigation, as returned by `GET /navigation`.
 *
 * PROVISIONAL: the build plan says the endpoint returns groups, subgroups and views,
 * already filtered by permission, but does not define the item fields. Align these
 * types with `cms/docs/conventions.md` once it is available.
 */

export interface NavItem {
  id: string;
  label: string;
  /** Absent on a parent that only groups children. */
  href?: string;
  /** Key into the icon registry in `nav-icons.ts`. */
  icon?: string;
  /** Small counter shown next to the label, e.g. open items. */
  badge?: number;
  /** Extra search terms that are not part of the label. */
  keywords?: string[];
  children?: NavItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}
