import { useQuery } from "@tanstack/react-query";

import { fetchDocuments } from "../api/docs.api";
import { docsKeys } from "./keys";

/** The published documents. Answers `404` where the docs are switched off. */
export function useDocuments() {
  return useQuery({
    queryKey: docsKeys.list(),
    queryFn: fetchDocuments,
    staleTime: Infinity,
    retry: false,
  });
}
