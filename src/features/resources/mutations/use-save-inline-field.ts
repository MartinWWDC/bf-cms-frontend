import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import type { RecordId } from "@/lib/api/types";

import { fetchResourceRecord, updateRecord } from "../api/resources.api";
import { getValue } from "../lib/contract";
import { isSameValue, toInputValue } from "../lib/input-values";
import { resourceKeys } from "../queries/keys";
import type { Field, RecordList } from "../types";
import { useInvalidateRecord } from "./use-invalidate-record";

interface SaveInlineInput {
  id: RecordId;
  field: Field;
  /** The new value, in the format the API takes on save. */
  value: unknown;
  /** The value the admin was looking at, in the same format. */
  shown: unknown;
  /** `meta.version` where the record is loaded (the drawer). A list row has none. */
  version?: string;
}

/**
 * Saves one field edited in place: a `PATCH` of only that field with the record version in
 * `If-Match` (`field-types.md` section 5, Inline fields).
 *
 * A list row carries no version, so the record is read first. If the field no longer holds
 * the value the admin saw, someone else changed it: that fails as `stale_record`, exactly
 * like a version the API refuses. The saved record goes straight into the cached lists, so
 * fields the save filled in (`filled_from`) show at once.
 */
export function useSaveInlineField(resource: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRecord(resource);

  return useMutation({
    mutationFn: async ({ id, field, value, shown, version }: SaveInlineInput) => {
      let ifMatch = version;
      if (ifMatch === undefined) {
        const current = await fetchResourceRecord(resource, id);
        if (!current.meta.abilities.update) throw new ApiError({ status: 403, code: "forbidden", message: "" });
        if (!isSameValue(toInputValue(field, getValue(current.data, field.name)), shown)) {
          throw new ApiError({ status: 409, code: "stale_record", message: "" });
        }
        ifMatch = current.meta.version;
      }
      return updateRecord(resource, id, ifMatch, { [field.name]: value === "" ? null : value });
    },
    onSuccess: (record, { id }) => {
      queryClient.setQueryData(resourceKeys.detail(resource, id), record);
      queryClient.setQueriesData<RecordList>({ queryKey: resourceKeys.lists(resource) }, (list) =>
        list && {
          ...list,
          data: list.data.map((row) => {
            if (String(row.id) !== String(id)) return row;
            const next = { ...row };
            for (const name of Object.keys(row)) if (name in record.data) next[name] = record.data[name];
            return next;
          }),
        },
      );
      void invalidate(id);
    },
    // Also after a failure: a stale row has to be reloaded.
    onError: (_error, { id }) => void invalidate(id),
  });
}
