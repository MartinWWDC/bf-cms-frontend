"use client";

import { useState } from "react";
import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import { ActionDialog, type ActionRun } from "@/features/resources/components/action-dialog";
import { useResourceContract } from "@/features/resources/queries";
import { useErrorMessage } from "@/lib/api/use-error-message";
import { recordHref } from "@/lib/routes";

import type { AssistantProposal } from "../types";

/**
 * A change the assistant suggests. Nothing happens here: "Review" opens the normal action
 * dialog prefilled with the proposal, where every normal rule applies (permission,
 * preview, reason, confirmation, risk flags, audit). A note or an assignment is done on
 * the record itself.
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
          <Link
            href={recordHref(proposal.resource, proposal.record_id)}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            {proposal.kind === "note" ? t("openForNote") : t("openForAssignment")}
          </Link>
        )}
        <span className="text-xs text-muted-foreground">{t("hint")}</span>
      </div>

      <ActionDialog run={run} onClose={() => setReviewing(false)} />
    </article>
  );
}
