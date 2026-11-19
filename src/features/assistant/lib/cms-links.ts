import { recordHref, resourceHref, routes } from "@/lib/routes";

/**
 * The assistant names CMS pages with `cms://` addresses (`conventions.md` section 19),
 * in `links` and as markdown links in `content`. They are mapped to this app's routes here.
 */

export type ResolvedLink =
  /** A page of this app. */
  | { kind: "internal"; href: string }
  /** Another website; opens in a new tab. */
  | { kind: "external"; href: string }
  /** Nothing to open (a document, a metric without a dashboard, an unknown or unsafe address). */
  | { kind: "none" };

const NONE: ResolvedLink = { kind: "none" };

function parseFilter(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function resolveCmsLink(address: string): ResolvedLink {
  const [path, search = ""] = address.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(search);

  if (parts[0] === "resources" && parts[1] && parts[2] === "records") {
    const resource = parts[1];
    // cms://resources/{resource}/records/{id}
    if (parts[3]) return { kind: "internal", href: recordHref(resource, parts[3]) };
    // cms://resources/{resource}/records?view=&tab=&filter=<JSON>&q=&sort=&group_by=
    return {
      kind: "internal",
      href: resourceHref(resource, query.get("view"), {
        tab: query.get("tab"),
        filter: parseFilter(query.get("filter")),
        q: query.get("q"),
        sort: query.get("sort"),
        groupBy: query.get("group_by"),
      }),
    };
  }

  // cms://dashboards/{dashboard}?range=
  if (parts[0] === "dashboards" && parts[1]) {
    const range = query.get("range");
    const href = routes.dashboard(parts[1]);
    return { kind: "internal", href: range ? `${href}?range=${encodeURIComponent(range)}` : href };
  }

  // cms://metrics/{metric} has no page of its own, cms://docs/{document} is not shown in the app.
  return NONE;
}

export function resolveLink(href: string): ResolvedLink {
  const address = href.trim();
  if (address.startsWith("cms://")) return resolveCmsLink(address.slice("cms://".length));
  if (/^https?:\/\//i.test(address)) return { kind: "external", href: address };
  return NONE;
}
