"use client";

import { UserRoundIcon, UserRoundPlusIcon, UserRoundXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useMe } from "@/features/session/queries";
import { useErrorToast } from "@/lib/api/use-error-message";

import { useAssignRecord } from "../mutations";
import type { Contract, RecordDetail } from "../types";
import { StaffPicker } from "./pickers";

interface AssigneeControlProps {
  contract: Contract;
  record: RecordDetail;
}

/**
 * The record's assignee, with what this admin may change (`conventions.md`, Assignment):
 * `assignments.self` to take a record or give back their own, `assignments.others` for any
 * change that involves another admin.
 */
export function AssigneeControl({ contract, record }: AssigneeControlProps) {
  const t = useTranslations("resources.assignment");
  const { data: me } = useMe();
  const assign = useAssignRecord(contract.key);
  const toastError = useErrorToast();
  const { can_assign_self: canSelf, can_assign_others: canOthers } = contract.collaboration.assignment;
  const assignee = record.meta.assignee;
  const assigneeId = assignee ? Number(assignee.id) : null;
  const isMine = me !== undefined && assigneeId === me.id;

  const change = (adminId: number | null) =>
    assign.mutate(
      { id: record.data.id, adminId },
      { onSuccess: () => toast.success(adminId === null ? t("unassigned") : t("assigned")), onError: toastError },
    );

  const buttonClass =
    "inline-flex h-7 items-center gap-1.5 rounded-md border bg-card px-2 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {canOthers ? (
        <StaffPicker
          size="sm"
          className="w-48"
          value={assigneeId}
          valueLabel={assignee?.title ?? null}
          placeholder={t("nobody")}
          clearable
          disabled={assign.isPending}
          onChange={(next) => {
            if (next === "me") return;
            if (next !== assigneeId) change(next);
          }}
        />
      ) : (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-card px-2 text-xs">
          <UserRoundIcon aria-hidden className="size-3.5 text-muted-foreground" />
          {assignee?.title ?? t("nobody")}
        </span>
      )}
      {me && !isMine && (assigneeId === null ? canSelf : canOthers) ? (
        <button type="button" className={buttonClass} disabled={assign.isPending} onClick={() => change(me.id)}>
          <UserRoundPlusIcon aria-hidden className="size-3.5" />
          {t("assignToMe")}
        </button>
      ) : null}
      {isMine && canSelf && !canOthers ? (
        <button type="button" className={buttonClass} disabled={assign.isPending} onClick={() => change(null)}>
          <UserRoundXIcon aria-hidden className="size-3.5" />
          {t("giveBack")}
        </button>
      ) : null}
    </div>
  );
}
