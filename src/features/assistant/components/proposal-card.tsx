"use client";

import { useState } from "react";
import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import { ActionDialog, type ActionRun } from "@/components/resource/action-dialog";
import { useAssignRecord, useCreateNote } from "@/features/resources/mutations";
import { useResourceContract } from "@/features/resources/queries";
import { useErrorMessage, useErrorToast } from "@/lib/api/use-error-message";
import { recordHref } from "@/lib/routes";

import type { AssistantProposal } from "../types";

/**
 * A change the assistant suggests. Nothing happens here: "Review" opens the normal action
 * dialog prefilled with the proposal, where every normal rule applies (permission,
 * preview, reason, confirmation, risk flags, audit). A note or an assignment is sent
 * with the normal note and assignment requests after the admin confirms it here.
 */
export function ProposalCard({ proposal }: { proposal: AssistantProposal }) {
  const t = useTranslations("assistant.proposals");
  const errorMessage = useErrorMessage();
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState(false);
  const isAction = proposal.kind === "action";
  // The contract is only needed once the admin wants to review the action.
  const contract = useResourceContract(isAction && reviewing ? proposal.resource : null);
  const action = contract.data?.actions.find((entry) => entry.key === proposal.action);
  const body = proposal.request.body as { input?: Record<string, unknown>; reason?: string | null };

  const run: ActionRun | null =
    reviewing && contract.data && action
      ? {
          resource: proposal.resource,
          resourceLabel: contract.data.label,
          action,
          target: { kind: "record", id: proposal.record_id },
          initialInput: body.input ?? proposal.input,
          initialReason: body.reason ?? proposal.reason ?? undefined,
          idempotencyKey: proposal.request.idempotency_key,
          onDone: () => setDone(true),
        }
      : null;

  const noteText = typeof proposal.input.body === "string" ? proposal.input.body : null;
  // A note or an assignment is sent from here, but only after the admin confirms it:
  // the assistant itself never changes anything.
  const toastError = useErrorToast();
  const [confirming, setConfirming] = useState(false);
  const createNote = useCreateNote(proposal.resource, proposal.record_id);
  const assign = useAssignRecord(proposal.resource);
  const sending = createNote.isPending || assign.isPending;
  const assigneeId = typeof proposal.input.admin_id === "number" ? proposal.input.admin_id : null;
  const send = () => {
    const handlers = {
      onSuccess: () => {
        setDone(true);
        setConfirming(false);
      },
      onError: toastError,
    };
    if (proposal.kind === "note" && noteText) {
      createNote.mutate(
        { body: noteText, format: proposal.input.format === "rich" ? "rich" : "plain" },
        handlers,
      );
    } else if (proposal.kind === "assignment") {
      assign.mutate({ id: proposal.record_id, adminId: assigneeId }, handlers);
    }
  };
  const canSend = proposal.kind === "assignment" || (proposal.kind === "note" && noteText !== null);
  const title =
    proposal.kind === "note"
      ? t("noteTitle")
      : proposal.kind === "assignment"
        ? proposal.label
          ? t("assignTitle", { name: proposal.label })
          : t("unassignTitle")
        : (proposal.label ?? proposal.action ?? t("actionTitle"));

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-brand/40 bg-card p-3 text-sm">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-sm bg-brand/15 px-1.5 py-0.5 font-mono text-[0.625rem] tracking-wider uppercase">
          {t("badge")}
        </span>
        <h4 className="font-medium">{title}</h4>
        {proposal.dangerous ? (
          <span className="inline-flex items-center gap-1 text-xs text-destructive">
            <TriangleAlertIcon aria-hidden className="size-3.5" />
            {t("dangerous")}
          </span>
        ) : null}
      </header>

      <p className="text-muted-foreground">
        {t("onRecord")}{" "}
        <Link
          href={recordHref(proposal.resource, proposal.record_id)}
          className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          {proposal.record_title ?? `#${proposal.record_id}`}
        </Link>
      </p>

      {noteText ? <p className="rounded-md bg-muted/60 p-2 break-words whitespace-pre-wrap">{noteText}</p> : null}
      {proposal.reason ? (
        <p>
          <span className="text-muted-foreground">{t("reason")}</span> {proposal.reason}
        </p>
      ) : null}
      {proposal.missing_inputs.length > 0 ? (
        <p className="text-muted-foreground">{t("missing", { fields: proposal.missing_inputs.join(", ") })}</p>
      ) : null}

      {contract.isError ? <p className="text-destructive">{errorMessage(contract.error)}</p> : null}
      {reviewing && contract.data && !action ? <p className="text-destructive">{t("unavailable")}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        {isAction ? (
          <Button size="sm" disabled={done || (reviewing && contract.isPending)} onClick={() => setReviewing(true)}>
            {done ? t("done") : reviewing && contract.isPending ? t("loading") : t("review")}
          </Button>
        ) : (
          <>
            {done ? (
              <Button size="sm" disabled>
                {t("done")}
              </Button>
            ) : confirming ? (
              <>
                <Button size="sm" disabled={sending} onClick={send}>
                  {proposal.kind === "note" ? t("confirmNote") : t("confirmAssignment")}
                </Button>
                <Button size="sm" variant="ghost" disabled={sending} onClick={() => setConfirming(false)}>
                  {t("cancel")}
                </Button>
              </>
            ) : canSend ? (
              <Button size="sm" onClick={() => setConfirming(true)}>
                {proposal.kind === "note" ? t("addNote") : t("applyAssignment")}
              </Button>
            ) : null}
            <Link
              href={recordHref(proposal.resource, proposal.record_id)}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              {proposal.kind === "note" ? t("openForNote") : t("openForAssignment")}
            </Link>
          </>
        )}
        <span className="text-xs text-muted-foreground">{t("hint")}</span>
      </div>

      <ActionDialog run={run} onClose={() => setReviewing(false)} />
    </article>
  );
}
