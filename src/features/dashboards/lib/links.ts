import { resourceHref } from "@/lib/routes";

import type { MetricLink } from "../types";

/** The list behind a number: the resource with exactly the link's view, tab and filter. */
export function metricLinkHref(link: MetricLink | null | undefined): string | null {
  if (!link) return null;
  return resourceHref(link.resource, link.view, { tab: link.tab, filter: link.filter ?? undefined });
}
