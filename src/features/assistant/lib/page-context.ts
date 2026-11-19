import type { AssistantPageContext } from "../types";

/** Search params of `/assistant` that carry the page the admin came from. */
const CONTEXT_PARAMS = ["resource", "record", "view", "tab", "filter", "q", "dashboard"] as const;

function parseFilter(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** The page context carried in the URL of `/assistant`; `null` when there is none. */
export function contextFromParams(params: URLSearchParams): AssistantPageContext | null {
  const context: AssistantPageContext = {};
  if (params.get("resource")) context.resource = params.get("resource");
  if (params.get("record")) context.record_id = params.get("record");
  if (params.get("view")) context.view = params.get("view");
  if (params.get("tab")) context.tab = params.get("tab");
  if (params.get("q")) context.q = params.get("q");
  if (params.get("dashboard")) context.dashboard = params.get("dashboard");
  const filter = parseFilter(params.get("filter"));
  if (filter !== undefined) context.filter = filter;
  return Object.keys(context).length > 0 ? context : null;
}

/**
 * The address of the assistant, carrying the page the admin is on:
 * `/r/{resource}/{view}` with its `tab`, `filter`, `q` and open `record`, or a dashboard.
 */
export function assistantHrefFor(pathname: string, search: string): string {
  const here = new URLSearchParams(search);
  const params = new URLSearchParams();

  const resource = /^\/r\/([^/]+)(?:\/([^/]+))?/.exec(pathname);
  if (resource) {
    params.set("resource", resource[1]);
    if (resource[2]) params.set("view", resource[2]);
    for (const key of ["tab", "filter", "q"] as const) {
      const value = here.get(key);
      if (value) params.set(key, value);
    }
    // `record` is `id`, or `resource:id` for a linked record of another resource.
    const record = here.get("record");
    if (record && record !== "new") {
      const separator = record.indexOf(":");
      if (separator === -1) params.set("record", record);
      else {
        params.set("resource", record.slice(0, separator));
        params.set("record", record.slice(separator + 1));
        for (const key of ["view", "tab", "filter", "q"]) params.delete(key);
      }
    }
  }

  const dashboard = /^\/dashboards\/([^/]+)/.exec(pathname);
  if (dashboard) params.set("dashboard", dashboard[1]);

  const query = params.toString();
  return query ? `/assistant?${query}` : "/assistant";
}

export function hasContextParams(params: URLSearchParams): boolean {
  return CONTEXT_PARAMS.some((key) => params.has(key));
}
