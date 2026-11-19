"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StaffPicker } from "@/features/resources/components/pickers";

import type { SettableTaskStatus, TaskOperation } from "../types";

export type TaskChangeKind = "assign" | "status" | "dismiss";

interface TaskChangeDialogProps {
  /** What is being changed; `null` closes the dialog. */
  kind: TaskChangeKind | null;
  /** How many tasks the change applies to. */
  count: number;
  /** Assigning to others needs `tasks.manage`; otherwise only unassigning is offered here. */
  canAssignOthers: boolean;
  isPending: boolean;
  onSubmit: (change: TaskOperation) => void;
  onClose: () => void;
}

const SETTABLE: readonly SettableTaskStatus[] = ["open", "in_progress", "done"];

/** Asks for what a task change needs: the new assignee, the new status with a reason, or the reason to dismiss. */
export function TaskChangeDialog({ kind, count, canAssignOthers, isPending, onSubmit, onClose }: TaskChangeDialogProps) {
  return (
    <Dialog open={kind !== null} onOpenChange={(open) => !open && onClose()}>
      {kind ? (
        <DialogContent>
          <ChangeForm
            key={kind}
            kind={kind}
            count={count}
            canAssignOthers={canAssignOthers}
            isPending={isPending}
            onSubmit={onSubmit}
            onClose={onClose}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function ChangeForm({
  kind,
  count,
  canAssignOthers,
  isPending,
  onSubmit,
  onClose,
}: Omit<TaskChangeDialogProps, "kind"> & { kind: TaskChangeKind }) {
  const t = useTranslations("tasks.change");
  const tTasks = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const [adminId, setAdminId] = useState<number | null>(null);
  const [status, setStatus] = useState<SettableTaskStatus>("done");
  const [reason, setReason] = useState("");

  const valid = kind === "dismiss" ? reason.trim() !== "" : true;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    if (kind === "assign") onSubmit({ operation: "assign", adminId });
    else if (kind === "status") onSubmit({ operation: "status", status, reason: reason.trim() || undefined });
    else onSubmit({ operation: "dismiss", reason: reason.trim() });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{t(`${kind}Title`)}</DialogTitle>
        <DialogDescription>{t("target", { count })}</DialogDescription>
      </DialogHeader>

      {kind === "assign" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-assignee">{t("assignee")}</Label>
          {canAssignOthers ? (
            <StaffPicker
              id="task-assignee"
              value={adminId}
              clearable
              placeholder={t("nobody")}
              onChange={(next) => setAdminId(typeof next === "number" ? next : null)}
            />
          ) : null}
          <p className="text-xs text-muted-foreground">{adminId === null ? t("unassignHint") : t("assignHint")}</p>
        </div>
      ) : null}

      {kind === "status" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-status">{t("status")}</Label>
          <SimpleSelect
            id="task-status"
            value={status}
            options={SETTABLE.map((value) => ({ value, label: tTasks(`status.${value}`) }))}
            onChange={(next) => setStatus(next as SettableTaskStatus)}
          />
          <p className="text-xs text-muted-foreground">{t("statusHint")}</p>
        </div>
      ) : null}

      {kind === "status" || kind === "dismiss" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-reason">
            {t("reason")}
            {kind === "dismiss" ? <span className="text-destructive">*</span> : null}
          </Label>
          <Textarea id="task-reason" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" variant={kind === "dismiss" ? "destructive" : "default"} disabled={isPending || !valid}>
          {t(`${kind}Submit`)}
        </Button>
      </DialogFooter>
    </form>
  );
}
