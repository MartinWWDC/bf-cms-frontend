"use client";

import { type FormEvent, useId, useMemo, useState } from "react";
import { DownloadIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { trackJob } from "@/features/jobs/hooks";
import { getApiErrorCode, isApiError, newIdempotencyKey } from "@/lib/api/client";
import { useErrorMessage } from "@/lib/api/use-error-message";

import { type ActionTarget, usePreviewAction, useRunAction } from "@/features/resources/mutations";
import type { Action, ActionFlag, ActionInput, ActionPreview, ActionResult, VisibleWhen } from "@/features/resources/types";
import { FieldInput } from "./field-input";
import { FieldValue } from "./field-value";

export interface ActionRun {
  resource: string;
  /** Plural label of the resource, for the job's name. */
  resourceLabel: string;
  action: Action;
  target: ActionTarget;
  /** Values the dialog starts with, e.g. from an assistant proposal or a scanned code. */
  initialInput?: Record<string, unknown>;
  initialReason?: string;
  /** Use this key instead of a fresh one (assistant proposals bring their own). */
  idempotencyKey?: string;
  /** Currency of the record, for money inputs without a fixed one. */
  currency?: string | null;
  /** Called after the action ran or was queued. */
  onDone?: (result: ActionResult | null) => void;
}

interface ActionDialogProps {
  /** The action to run; `null` closes the dialog. */
  run: ActionRun | null;
  onClose: () => void;
}

/**
 * The one dialog that runs every action of every resource (`conventions.md` section 8):
 * inputs from the contract, a preview with risk flags where offered, a reason where
 * required, a confirmation for dangerous actions, and an idempotency key per intent.
 */
export function ActionDialog({ run, onClose }: ActionDialogProps) {
  return (
    <Dialog open={run !== null} onOpenChange={(open) => !open && onClose()}>
      {run ? (
        <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
          {/* Remount per action so no input of a previous run survives. */}
          <ActionForm key={`${run.resource}-${run.action.key}-${JSON.stringify(run.target)}`} run={run} onClose={onClose} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function isVisible(rule: VisibleWhen | null | undefined, input: Record<string, unknown>): boolean {
  if (!rule) return true;
  const value = input[rule.field];
  const empty = value === null || value === undefined || value === "";
  switch (rule.operator) {
    case "is":
      return String(value ?? "") === String(rule.value ?? "");
    case "is_not":
      return String(value ?? "") !== String(rule.value ?? "");
    case "in":
      return Array.isArray(rule.value) && rule.value.map(String).includes(String(value));
    case "not_in":
      return Array.isArray(rule.value) && !rule.value.map(String).includes(String(value));
    case "is_empty":
      return empty;
    case "is_not_empty":
      return !empty;
    case "gt":
      return Number(value) > Number(rule.value);
    case "gte":
      return Number(value) >= Number(rule.value);
    case "lt":
      return Number(value) < Number(rule.value);
    case "lte":
      return Number(value) <= Number(rule.value);
    default:
      // A rule this version cannot evaluate must not hide an input.
      return true;
  }
}

function isBlank(value: unknown) {
  return value === null || value === undefined || value === "";
}

function ActionForm({ run, onClose }: { run: ActionRun; onClose: () => void }) {
  const { action, target } = run;
  const t = useTranslations("resources.actions");
  const tCommon = useTranslations("common");
  const errorMessage = useErrorMessage();
  const formId = useId();
  const preview = usePreviewAction(run.resource);
  const runAction = useRunAction(run.resource);

  const [input, setInput] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of action.inputs) {
      if (field.type === "boolean") initial[field.name] = false;
    }
    return { ...initial, ...run.initialInput };
  });
  const [reason, setReason] = useState(run.initialReason ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  // One key per intent: reused when the same request is retried, renewed when the input changes.
  const [idempotencyKey, setIdempotencyKey] = useState(() => run.idempotencyKey ?? newIdempotencyKey());
  const [shownPreview, setShownPreview] = useState<ActionPreview | null>(null);
  const [failed, setFailed] = useState<ActionResult | null>(null);

  const canPreview = action.preview && target.kind === "record";
  const visibleInputs = useMemo(
    () => action.inputs.filter((field) => isVisible(field.visible_when, input)),
    [action.inputs, input],
  );

  const error = runAction.error ?? preview.error;
  const fieldErrors = isApiError(error) ? error.fields : {};
  const errorFor = (name: string) => fieldErrors[`input.${name}`]?.[0] ?? fieldErrors[name]?.[0];
  // Flags the API named when it refused the run (`risk_unacknowledged`, `risk_blocked`).
  const refusedFlags = isApiError(error) && Array.isArray(error.details.flags) ? (error.details.flags as ActionFlag[]) : [];
  const flags = shownPreview?.flags.length ? shownPreview.flags : refusedFlags;
  const warnings = flags.filter((flag) => flag.level === "warning");
  const blocked = flags.some((flag) => flag.level === "blocking");

  const cleanInput = () =>
    Object.fromEntries(
      visibleInputs.map((field) => [field.name, input[field.name]]).filter(([, value]) => value !== undefined),
    ) as Record<string, unknown>;

  const missingInput = visibleInputs.some((field) => field.required && isBlank(input[field.name]));
  const missingReason = action.requires_reason && reason.trim() === "";
  const needsPreview = canPreview && shownPreview === null;
  const unacknowledged = warnings.some((flag) => !acknowledged.includes(flag.code));
  const canRun =
    !missingInput && !missingReason && !blocked && !unacknowledged && (!action.dangerous || confirmed) && !runAction.isPending;

  const changeInput = (name: string, value: unknown) => {
    setInput((current) => ({ ...current, [name]: value }));
    // A changed input is a new intent: the old preview and key no longer describe it.
    setShownPreview(null);
    setAcknowledged([]);
    setFailed(null);
    preview.reset();
    runAction.reset();
    if (!run.idempotencyKey) setIdempotencyKey(newIdempotencyKey());
  };

  const loadPreview = () => {
    if (target.kind !== "record") return;
    runAction.reset();
    preview.mutate(
      { id: target.id, action: action.key, input: cleanInput() },
      {
        onSuccess: (data) => {
          setShownPreview(data);
          setAcknowledged([]);
        },
      },
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (needsPreview) {
      if (!missingInput) loadPreview();
      return;
    }
    if (!canRun) return;
    setFailed(null);
    runAction.mutate(
      {
        action: action.key,
        target,
        idempotencyKey,
        request: {
          input: cleanInput(),
          reason: reason.trim() || undefined,
          confirm: action.dangerous ? true : undefined,
          acknowledged_flags: acknowledged.length ? acknowledged : undefined,
        },
      },
      {
        onSuccess: (outcome) => {
          if (outcome.kind === "job") {
            trackJob({
              id: outcome.job.job_id,
              label: t("jobLabel", { action: action.label, resource: run.resourceLabel }),
            });
            toast.success(t("queued"));
            run.onDone?.(null);
            onClose();
            return;
          }
          const { result } = outcome;
          if (!result.succeeded) {
            // The action ran but could not do its work. A retry is a new intent.
            setFailed(result);
            if (!run.idempotencyKey) setIdempotencyKey(newIdempotencyKey());
            return;
          }
          toast.success(result.message);
          if (result.download) window.open(result.download.url, "_blank", "noopener,noreferrer");
          run.onDone?.(result);
          onClose();
        },
        onError: (failure) => {
          // The record changed state, or the key was used with other input: start a fresh intent.
          const code = getApiErrorCode(failure);
          if ((code === "duplicate_request" || code === "action_unavailable") && !run.idempotencyKey) {
            setIdempotencyKey(newIdempotencyKey());
          }
        },
      },
    );
  };

  const isPending = runAction.isPending || preview.isPending;
  const busy = isApiError(runAction.error) && runAction.error.code === "money_flow_busy";

  return (
    <>
      <DialogHeader className="border-b px-5 pt-5 pb-4 pr-12">
        <DialogTitle>{action.label}</DialogTitle>
        <DialogDescription>
          {target.kind === "bulk"
            ? target.count === null
              ? t("targetAllMatching")
              : t("targetMany", { count: target.count })
            : target.kind === "standalone"
              ? t("targetStandalone", { resource: run.resourceLabel })
              : t("targetOne")}
        </DialogDescription>
      </DialogHeader>

      <form id={formId} onSubmit={submit} className="scrollbar-slim flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4">
        {visibleInputs.map((field) => (
          <ActionInputRow
            key={field.name}
            field={field}
            value={input[field.name]}
            currency={run.currency}
            error={errorFor(field.name)}
            disabled={runAction.isPending}
            onChange={(value) => changeInput(field.name, value)}
          />
        ))}

        {action.requires_reason || reason ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-reason`}>
              {t("reason")}
              {action.requires_reason ? <span className="text-destructive">*</span> : null}
            </Label>
            <Textarea
              id={`${formId}-reason`}
              rows={2}
              value={reason}
              disabled={runAction.isPending}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={Boolean(fieldErrors.reason) || undefined}
              className="bg-card"
            />
            <p className="text-xs text-muted-foreground">{t("reasonHint")}</p>
            {fieldErrors.reason ? <p className="text-sm text-destructive">{fieldErrors.reason[0]}</p> : null}
          </div>
        ) : null}

        {shownPreview ? <PreviewSummary preview={shownPreview} currency={run.currency} /> : null}

        {flags.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {flags.map((flag) => (
              <FlagRow
                key={flag.code}
                flag={flag}
                checked={acknowledged.includes(flag.code)}
                disabled={runAction.isPending}
                acknowledgeLabel={t("acknowledge")}
                blockedLabel={t("blocking")}
                onChange={(checked) =>
                  setAcknowledged((current) =>
                    checked ? [...current, flag.code] : current.filter((code) => code !== flag.code),
                  )
                }
              />
            ))}
          </ul>
        ) : null}

        {action.dangerous && !needsPreview && !blocked ? (
          <label className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={confirmed}
              disabled={runAction.isPending}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <span>{t("confirmDangerous", { action: action.label })}</span>
          </label>
        ) : null}

        {failed ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {failed.message}
          </p>
        ) : null}
        {error && !(isApiError(error) && (error.code === "risk_unacknowledged" || error.code === "risk_blocked")) ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage(error)}
            {busy ? ` ${t("busyRetry")}` : null}
            {isApiError(error) && error.requestId ? (
              <span className="mt-1 block font-mono text-xs opacity-80 select-all">{error.requestId}</span>
            ) : null}
          </p>
        ) : null}
        {failed?.download ? (
          <a href={failed.download.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
            <DownloadIcon className="size-3.5" />
            {failed.download.name}
          </a>
        ) : null}
      </form>

      <DialogFooter className="m-0 rounded-none border-t bg-muted/50 px-5 py-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={runAction.isPending}>
          {tCommon("cancel")}
        </Button>
        {canPreview && shownPreview ? (
          <Button type="button" variant="outline" onClick={loadPreview} disabled={isPending || missingInput}>
            {t("refreshPreview")}
          </Button>
        ) : null}
        <Button
          type="submit"
          form={formId}
          variant={action.dangerous || action.tone === "danger" ? "destructive" : "default"}
          disabled={needsPreview ? missingInput || preview.isPending : !canRun}
        >
          {needsPreview
            ? preview.isPending
              ? t("previewing")
              : t("preview")
            : runAction.isPending
              ? t("running")
              : busy
                ? t("retry")
                : action.label}
        </Button>
      </DialogFooter>
    </>
  );
}

function ActionInputRow({
  field,
  value,
  currency,
  error,
  disabled,
  onChange,
}: {
  field: ActionInput;
  value: unknown;
  currency?: string | null;
  error?: string;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const inline = field.type === "boolean";

  return (
    <div className={cn("flex gap-1.5", inline ? "flex-row items-center justify-between" : "flex-col")}>
      <Label htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-destructive">*</span> : null}
      </Label>
      <FieldInput
        id={id}
        field={field}
        value={value}
        currency={currency}
        invalid={Boolean(error)}
        disabled={disabled}
        onChange={onChange}
        aria-describedby={field.help || error ? helpId : undefined}
      />
      {field.help || error ? (
        <p id={helpId} className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground", inline && "hidden")}>
          {error ?? field.help}
        </p>
      ) : null}
    </div>
  );
}

/** What the action will do. A summary value can be text, a number or a money object. */
function PreviewSummary({ preview, currency }: { preview: ActionPreview; currency?: string | null }) {
  const t = useTranslations("resources.actions");
  if (preview.summary.length === 0) return null;

  return (
    <section aria-label={t("previewTitle")} className="rounded-md border bg-muted/40">
      <h3 className="border-b px-3 py-1.5 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">
        {t("previewTitle")}
      </h3>
      <dl className="divide-y">
        {preview.summary.map((line, index) => {
          const isMoneyValue = typeof line.value === "object" && line.value !== null && "amount" in line.value;
          return (
            <div key={index} className="flex items-center justify-between gap-4 px-3 py-1.5 text-sm">
              <dt className="text-muted-foreground">{line.label}</dt>
              <dd className="text-right font-medium">
                <FieldValue
                  field={{
                    name: `summary-${index}`,
                    type: isMoneyValue ? "money" : typeof line.value === "boolean" ? "boolean" : "text",
                    config: { currency: currency ?? undefined },
                  }}
                  value={line.value}
                  variant="detail"
                />
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function FlagRow({
  flag,
  checked,
  disabled,
  acknowledgeLabel,
  blockedLabel,
  onChange,
}: {
  flag: ActionFlag;
  checked: boolean;
  disabled: boolean;
  acknowledgeLabel: string;
  blockedLabel: string;
  onChange: (checked: boolean) => void;
}) {
  const blocking = flag.level === "blocking";

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-md border p-3 text-sm",
        blocking ? "border-destructive/40 bg-destructive/5" : "border-tone-warning/50 bg-tone-warning/10",
      )}
    >
      <p className="flex items-start gap-2">
        {blocking ? (
          <OctagonXIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
        ) : (
          <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-tone-warning" />
        )}
        <span>{flag.message}</span>
      </p>
      {blocking ? (
        <p className="pl-6 text-xs font-medium text-destructive">{blockedLabel}</p>
      ) : (
        <label className="flex items-center gap-2 pl-6 text-xs font-medium">
          <Checkbox checked={checked} disabled={disabled} onCheckedChange={(next) => onChange(next === true)} />
          {acknowledgeLabel}
        </label>
      )}
    </li>
  );
}
