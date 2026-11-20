"use client";

import { type ComponentType, useState } from "react";
import { PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useErrorToast } from "@/lib/api/use-error-message";
import { isMoney, type RecordId } from "@/lib/api/types";

import { getAction, getRecordTitle, getValue } from "../lib/contract";
import { useDeleteRecord, useRestoreRecord } from "../mutations";
import { useResourceContract, useResourceRecord } from "../queries";
import type { Action, Contract, InlineField, RecordDetail, RecordScreenProps, ScreenRegistry } from "../types";
import { ActionDialog, type ActionRun } from "@/components/resource/action-dialog";
import { AssigneeControl } from "./assignee-control";
import { HistoryPanel } from "./history-panel";
import { NotesPanel } from "./notes-panel";
import { RecordDetails } from "./record-details";
import { RecordForm } from "./record-form";
import { RelatedList } from "./related-list";

/** Id used in the URL for the create form. */
export const NEW_RECORD = "new";


interface RecordDrawerProps {
  /** The record to show; `null` closes the drawer. `id: "new"` shows the create form. */
  open: { resource: string; id: string; view?: string | null } | null;
  onClose: () => void;
  /** Opens another record in the drawer (a linked record, a related row). */
  onOpenRecord: (resource: string, id: RecordId) => void;
  /** Keys of the actions that belong to the tab the admin came from; offered first. */
  tabActions?: string[];
  /** Inline fields of the tab the admin came from; editable in place on the Details tab. */
  inline?: InlineField[];
  screens?: ScreenRegistry;
}

/**
 * Wide detail drawer for one record of any resource: the contract's sections, related
 * lists, notes, history, editing and the record's actions. Rendered entirely from the
 * resource contract and the record's `meta`.
 */
export function RecordDrawer({ open, onClose, onOpenRecord, tabActions, inline, screens }: RecordDrawerProps) {
  // Keep showing the last record while the drawer animates closed.
  const [last, setLast] = useState(open);
  if (open !== null && (open.resource !== last?.resource || open.id !== last?.id || open.view !== last?.view)) {
    setLast(open);
  }
  const shown = open ?? last;

  return (
    <Sheet open={open !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[min(calc(100vw-3rem),64rem)] data-[side=right]:sm:max-w-none"
      >
        {shown ? (
          <DrawerBody
            key={`${shown.resource}:${shown.id}`}
            resource={shown.resource}
            id={shown.id}
            view={shown.view ?? null}
            onClose={onClose}
            onOpenRecord={onOpenRecord}
            tabActions={tabActions}
            inline={inline}
            screens={screens}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

interface DrawerBodyProps {
  resource: string;
  id: string;
  /** Key of the list view the record was opened from; `null` for a direct link. */
  view: string | null;
  onClose: () => void;
  onOpenRecord: (resource: string, id: RecordId) => void;
  tabActions?: string[];
  inline?: InlineField[];
  screens?: ScreenRegistry;
}

function DrawerBody({ resource, id, view, onClose, onOpenRecord, tabActions, inline, screens }: DrawerBodyProps) {
  const t = useTranslations("resources.drawer");
  const isNew = id === NEW_RECORD;
  const contract = useResourceContract(resource);
  const record = useResourceRecord(resource, isNew ? null : id);

  if (contract.isError || record.isError) {
    return (
      <>
        <SheetHeader className="sr-only">
          <SheetTitle>{t("loadFailedTitle")}</SheetTitle>
          <SheetDescription>{t("loadFailedHint")}</SheetDescription>
        </SheetHeader>
        <ErrorState
          title={t("loadFailedTitle")}
          error={contract.error ?? record.error}
          onRetry={() => (contract.isError ? contract.refetch() : record.refetch())}
        />
      </>
    );
  }
  if (!contract.data || (!isNew && !record.data)) return <DrawerSkeleton />;

  if (isNew) {
    return (
      <>
        <SheetHeader className="gap-1 border-b px-5 pt-5 pb-4 pr-14 sm:px-7">
          <SheetTitle className="text-xl leading-tight font-semibold tracking-tight sm:text-2xl">
            {t("createTitle", { type: contract.data.label_singular })}
          </SheetTitle>
          <SheetDescription className="sr-only">{t("createDescription")}</SheetDescription>
        </SheetHeader>
        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
          <RecordForm
            contract={contract.data}
            record={null}
            onCancel={onClose}
            onSaved={(saved) => onOpenRecord(resource, saved.data.id)}
          />
        </div>
      </>
    );
  }

  return (
    <RecordContent
      contract={contract.data}
      record={record.data as RecordDetail}
      // A view the contract no longer has (an old link) would answer 404: open the default screen instead.
      view={contract.data.views.some((entry) => entry.key === view) ? view : null}
      onClose={onClose}
      onOpenRecord={onOpenRecord}
      tabActions={tabActions}
      inline={inline}
      Screen={contract.data.detail.custom_endpoint ? screens?.[resource] : undefined}
    />
  );
}

interface RecordContentProps {
  contract: Contract;
  record: RecordDetail;
  view: string | null;
  onClose: () => void;
  onOpenRecord: (resource: string, id: RecordId) => void;
  tabActions?: string[];
  inline?: InlineField[];
  Screen?: ComponentType<RecordScreenProps>;
}

function RecordContent({ contract, record, view, onClose, onOpenRecord, tabActions, inline, Screen }: RecordContentProps) {
  const t = useTranslations("resources.drawer");
  const { meta, data } = record;
  const [tab, setTab] = useState(Screen ? "overview" : "details");
  const [editing, setEditing] = useState(false);
  const [run, setRun] = useState<ActionRun | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const restore = useRestoreRecord(contract.key);
  const toastError = useErrorToast();

  const title = getRecordTitle(contract, data, meta.title);
  const related = contract.detail.related
    .map((name) => ({
      relation: contract.relations.find((relation) => relation.name === name),
      state: meta.related.find((entry) => entry.relation === name),
    }))
    // A related list the admin may not view is hidden.
    .filter((entry) => entry.relation !== undefined && entry.state?.viewable !== false);
  const { notes, assignment } = contract.collaboration;
  const showNotes = contract.detail.panels.includes("notes") && notes.enabled && notes.can_view;
  const showHistory = contract.detail.panels.includes("history");

  // The record's own currency, for money inputs of actions without a fixed currency.
  const currency = (() => {
    const direct = getValue(data, "currency");
    if (typeof direct === "string") return direct;
    const money = Object.values(data).find(isMoney);
    return money ? money.currency : null;
  })();

  // Actions that apply to this record now, the tab's own first.
  const actions = meta.actions
    .map((key) => getAction(contract, key))
    .filter((action): action is Action => action !== undefined && action.scope !== "standalone" && action.scope !== "many")
    .sort((a, b) => Number(tabActions?.includes(b.key) ?? false) - Number(tabActions?.includes(a.key) ?? false));
  const everyday = actions.filter((action) => !action.dangerous && action.tone !== "danger");
  const dangerous = actions.filter((action) => action.dangerous || action.tone === "danger");

  const runAction = (action: Action, initialInput?: Record<string, unknown>) =>
    setRun({
      resource: contract.key,
      resourceLabel: contract.label,
      action,
      target: { kind: "record", id: data.id },
      initialInput,
      currency,
    });

  return (
    <>
      <SheetHeader className="gap-3 border-b px-5 pt-5 pb-4 pr-14 sm:px-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
            {contract.label_singular} <span className="text-foreground normal-case">#{String(data.id)}</span>
          </span>
          {meta.trashed ? <StatusBadge label={t("deleted")} tone="danger" /> : null}
        </div>
        <SheetTitle className="text-xl leading-tight font-semibold tracking-tight break-words sm:text-2xl">
          {title}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {t("description", { type: contract.label_singular, id: String(data.id) })}
        </SheetDescription>
        <div className="flex flex-wrap items-center gap-2">
          {assignment.enabled ? <AssigneeControl contract={contract} record={record} /> : null}
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {meta.abilities.update && !meta.trashed && !editing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTab("details");
                  setEditing(true);
                }}
              >
                <PencilIcon />
                {t("edit")}
              </Button>
            ) : null}
            {meta.abilities.restore && meta.trashed ? (
              <Button
                variant="outline"
                size="sm"
                disabled={restore.isPending}
                onClick={() =>
                  restore.mutate({ id: data.id }, { onSuccess: () => toast.success(t("restored")), onError: toastError })
                }
              >
                <RotateCcwIcon />
                {t("restore")}
              </Button>
            ) : null}
            {meta.abilities.delete && !meta.trashed ? (
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2Icon />
                {t("delete")}
              </Button>
            ) : null}
          </div>
        </div>
      </SheetHeader>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
        <Tabs value={tab} onValueChange={(next) => setTab(String(next))} className="gap-0">
          {/* The row scrolls sideways when the tabs do not fit; the list itself never clips its tabs. */}
          <div className="sticky top-0 z-10 overflow-x-auto overflow-y-hidden border-b bg-popover px-5 [scrollbar-width:none] sm:px-7 [&::-webkit-scrollbar]:hidden">
            <TabsList variant="line" className="h-11! w-max justify-start gap-4 p-0">
              {Screen ? (
                <TabsTrigger value="overview" className="flex-none px-0">
                  {t("tabOverview")}
                </TabsTrigger>
              ) : null}
              <TabsTrigger value="details" className="flex-none px-0">
                {t("tabDetails")}
              </TabsTrigger>
              {related.length > 0 ? (
                <TabsTrigger value="related" className="flex-none px-0">
                  {t("tabRelated")}
                </TabsTrigger>
              ) : null}
              {showNotes ? (
                <TabsTrigger value="notes" className="flex-none gap-1.5 px-0">
                  {t("tabNotes")}
                  {meta.notes_count ? (
                    <span className="rounded-sm bg-muted px-1 font-mono text-[0.625rem]">{meta.notes_count}</span>
                  ) : null}
                </TabsTrigger>
              ) : null}
              {showHistory ? (
                <TabsTrigger value="history" className="flex-none px-0">
                  {t("tabHistory")}
                </TabsTrigger>
              ) : null}
            </TabsList>
          </div>

          {Screen ? (
            <TabsContent value="overview">
              <Screen
                contract={contract}
                record={record}
                view={view}
                onOpenRecord={onOpenRecord}
                onShowRecord={(next) => onOpenRecord(contract.key, next)}
                onRunAction={(key, initialInput) => {
                  const action = getAction(contract, key);
                  if (action) runAction(action, initialInput);
                }}
              />
            </TabsContent>
          ) : null}

          <TabsContent value="details">
            {editing ? (
              <RecordForm
                contract={contract}
                record={record}
                onCancel={() => setEditing(false)}
                onSaved={() => setEditing(false)}
              />
            ) : (
              <RecordDetails
                contract={contract}
                record={record}
                inline={inline}
                onOpenRecord={onOpenRecord}
                onRunAction={(action, _id, initialInput) => runAction(action, initialInput)}
              />
            )}
          </TabsContent>

          {related.length > 0 ? (
            <TabsContent value="related" className="flex flex-col gap-5 px-5 py-6 sm:px-7">
              {tab === "related"
                ? related.map(({ relation, state }) =>
                    relation ? (
                      <RelatedList
                        key={relation.name}
                        resource={contract.key}
                        recordId={data.id}
                        relation={relation}
                        count={state?.count ?? null}
                        onOpenRecord={onOpenRecord}
                      />
                    ) : null,
                  )
                : null}
            </TabsContent>
          ) : null}

          {showNotes ? (
            <TabsContent value="notes">
              {tab === "notes" ? <NotesPanel contract={contract} recordId={data.id} onOpenRecord={onOpenRecord} /> : null}
            </TabsContent>
          ) : null}

          {showHistory ? (
            <TabsContent value="history">
              {tab === "history" ? (
                <HistoryPanel contract={contract} recordId={data.id} onOpenRecord={onOpenRecord} />
              ) : null}
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      {actions.length > 0 && !editing ? (
        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-muted/50 px-5 py-3 sm:px-7">
          {everyday.map((action) => (
            <Button
              key={action.key}
              variant={tabActions?.includes(action.key) ? "default" : "outline"}
              className={tabActions?.includes(action.key) ? undefined : "bg-card"}
              onClick={() => runAction(action)}
            >
              {action.label}
            </Button>
          ))}
          {/* Dangerous actions sit apart on the right, away from the everyday ones. */}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {dangerous.map((action) => (
              <Button key={action.key} variant="destructive" onClick={() => runAction(action)}>
                {action.label}
              </Button>
            ))}
          </div>
        </footer>
      ) : null}

      <ActionDialog run={run} onClose={() => setRun(null)} />
      <DeleteDialog
        contract={contract}
        record={record}
        title={title}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onDeleted={contract.soft_deletes ? undefined : onClose}
      />
    </>
  );
}

function DeleteDialog({
  contract,
  record,
  title,
  open,
  onOpenChange,
  onDeleted,
}: {
  contract: Contract;
  record: RecordDetail;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the record is gone for good; a soft-deleted record stays open. */
  onDeleted?: () => void;
}) {
  const t = useTranslations("resources.drawer");
  const tCommon = useTranslations("common");
  const toastError = useErrorToast();
  const remove = useDeleteRecord(contract.key);
  const [reason, setReason] = useState("");
  const needsReason = contract.writes_require_reason;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle", { type: contract.label_singular })}</AlertDialogTitle>
          <AlertDialogDescription>
            {contract.soft_deletes ? t("deleteSoftDescription", { title }) : t("deleteDescription", { title })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {needsReason ? (
          <Textarea
            rows={2}
            value={reason}
            placeholder={t("deleteReason")}
            aria-label={t("deleteReason")}
            onChange={(event) => setReason(event.target.value)}
          />
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={remove.isPending || (needsReason && reason.trim() === "")}
            onClick={() =>
              remove.mutate(
                { id: record.data.id, version: record.meta.version, reason: reason.trim() || undefined },
                {
                  onSuccess: () => {
                    toast.success(t("deletedToast"));
                    onOpenChange(false);
                    onDeleted?.();
                  },
                  onError: (error) => {
                    // `record_in_use`, `stale_record`, ...: the message says why.
                    toastError(error);
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            {t("delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DrawerSkeleton() {
  const t = useTranslations("resources.drawer");

  return (
    <>
      <SheetHeader className="gap-3 border-b px-5 pt-5 pb-4 sm:px-7">
        <SheetTitle className="sr-only">{t("loadingTitle")}</SheetTitle>
        <SheetDescription className="sr-only">{t("loadingDescription")}</SheetDescription>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-80 max-w-full" />
      </SheetHeader>
      <div className="flex flex-col gap-4 px-5 py-6 sm:px-7">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-8" />
        ))}
      </div>
    </>
  );
}

export type { RecordScreenProps, ScreenRegistry };
