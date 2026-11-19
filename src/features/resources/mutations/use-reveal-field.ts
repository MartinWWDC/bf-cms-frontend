import { useMutation } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { revealField } from "../api/resources.api";

/**
 * Reveals one sensitive value. A mutation on purpose: every call is logged by the backend,
 * and the answer must not be cached or stored (`conventions.md` section 11).
 */
export function useRevealField(resource: string, id: RecordId) {
  return useMutation({
    mutationFn: (field: string) => revealField(resource, id, field),
    gcTime: 0,
  });
}
