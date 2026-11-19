import type { RecordId } from "@/lib/api/types";

/** Global search (`conventions.md` section 17; `GlobalSearch`, `GlobalSearchGroup` in the spec). */

export interface SearchIdentifier {
  /** `record_id`, `uuid`, `email`, `tracking_number`, `payment_reference` or `phone`. */
  kind: string;
  /** In the admin's language. */
  label: string;
  value: string;
}

export interface SearchResult {
  resource: string;
  id: RecordId;
  title: string;
  subtitle: string | null;
  /** Found by a recognised identifier, looked up exactly. */
  exact: boolean;
}

export interface SearchGroup {
  resource: string;
  label: string;
  /** The resource's search index cannot be reached at the moment. */
  unavailable: boolean;
  /** More than the 5 results shown; open the resource list with the same `q`. */
  has_more: boolean;
  results: SearchResult[];
}

export interface RecentRecord {
  resource: string;
  id: RecordId;
  title: string;
  subtitle: string | null;
  viewed_at: string | null;
}

export interface GlobalSearch {
  query: string;
  identifiers: SearchIdentifier[];
  groups: SearchGroup[];
  /** Filled when `q` is empty: the last 20 records the admin opened. */
  recent: RecentRecord[];
}

/** `q` is at most 200 characters; longer answers `422`. */
export const MAX_QUERY_LENGTH = 200;
