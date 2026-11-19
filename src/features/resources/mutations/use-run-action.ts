import { useMutation } from "@tanstack/react-query";

import type { QueuedJob, RecordId } from "@/lib/api/types";

import { runBulkAction, runRecordAction, runStandaloneAction } from "../api/resources.api";
import type { ActionRequest, ActionResult, BulkTarget } from "../types";
import { useInvalidateRecord } from "./use-invalidate-record";

/** Where an action runs: on one record, on many, or on the resource itself. */
export type ActionTarget =
  | { kind: "record"; id: RecordId }
  | { kind: "bulk"; target: BulkTarget; count: number | null }
  | { kind: "standalone" };

interface RunInput {
  action: string;
  target: ActionTarget;
  request: ActionRequest;
  /** One key per user intent. Reuse it when the same intent is retried. */
  idempotencyKey: string;
}

export type RunActionOutcome = { kind: "result"; result: ActionResult } | { kind: "job"; job: QueuedJob };

/**
 * Runs an action. One record and standalone actions answer with a result; an action on
 * many records is queued and answers with a job to follow.
 */
export function useRunAction(resource: string) {
  const invalidate = useInvalidateRecord(resource);

  return useMutation({
    mutationFn: async ({ action, target, request, idempotencyKey }: RunInput): Promise<RunActionOutcome> => {
      if (target.kind === "bulk") {
        return { kind: "job", job: await runBulkAction(resource, action, target.target, request, idempotencyKey) };
      }
      const result =
        target.kind === "record"
          ? await runRecordAction(resource, target.id, action, request, idempotencyKey)
          : await runStandaloneAction(resource, action, request, idempotencyKey);
      return { kind: "result", result };
    },
    // Also after a failure: the action may have changed the record before it failed.
    onSettled: (_outcome, _error, { target }) => invalidate(target.kind === "record" ? target.id : null),
  });
}
