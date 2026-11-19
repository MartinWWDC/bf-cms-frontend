import { useMutation } from "@tanstack/react-query";

import type { RecordId } from "@/lib/api/types";

import { suggestTranslations } from "../api/resources.api";
import type { TranslationSuggestionRequest } from "../types";

/** Machine translation suggestions for empty languages. Nothing is saved. */
export function useSuggestTranslations(resource: string, id: RecordId | null) {
  return useMutation({
    mutationFn: (request: TranslationSuggestionRequest) => suggestTranslations(resource, id, request),
  });
}
