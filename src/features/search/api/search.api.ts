import { getData } from "@/lib/api/client";

import type { GlobalSearch } from "../types";

/** An empty `query` answers with the records the admin opened last. */
export function fetchGlobalSearch(query: string, signal?: AbortSignal): Promise<GlobalSearch> {
  return getData<GlobalSearch>("/search", { params: { q: query || undefined }, signal });
}
