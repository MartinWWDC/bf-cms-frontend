import { useQuery } from "@tanstack/react-query";

import { fetchDocument } from "../api/docs.api";
import { docsKeys } from "./keys";

export function useDocument(name: string | null) {
  return useQuery({
    queryKey: docsKeys.document(name ?? ""),
    queryFn: () => fetchDocument(name as string),
    enabled: name !== null,
    staleTime: Infinity,
  });
}
