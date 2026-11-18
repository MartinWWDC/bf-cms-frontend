"use client";

import { useState } from "react";
import {
  BanIcon,
  CircleDotIcon,
  EyeIcon,
  type LucideIcon,
  SendIcon,
  StickyNoteIcon,
  Undo2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDate, formatTime } from "@/lib/format";

import { useRunRecordAction } from "../mutations";
import { useResourceRecord } from "../queries";
import { getField } from "../lib/resource-columns";
import type {
  ActionDefinition,
  ActivityEntry,
  FieldDefinition,
  ResourceContract,
  ResourceRecord,
} from "../types";
import { FieldValue } from "./field-value";

const ACTION_ICONS: Record<string, LucideIcon> = {
  note: StickyNoteIcon,
  send: SendIcon,
  refund: Undo2Icon,
  cancel: BanIcon,
};

interface RecordDrawerProps {
  contract: ResourceContract;
  /** Id of the record to show; `null` closes the drawer. */
  recordId: string | null;
  /** The row from the list, shown instantly while the full record loads. */
  listRecord?: ResourceRecord;
  onClose: () => void;
}

/**
 * Wide detail drawer for one record: headline figures, the contract's detail sections,
 * activity, and the record's actions. Rendered entirely from the resource contract.
 */
export function RecordDrawer({ contract, recordId, listRecord, onClose }: RecordDrawerProps) {
  // Keep showing the last record while the drawer animates closed.
  const [lastRecordId, setLastRecordId] = useState(recordId);
  if (recordId !== null && recordId !== lastRecordId) setLastRecordId(recordId);
  const shownId = recordId ?? lastRecordId;

  const detail = useResourceRecord(contract.key, shownId);
  const record = detail.data?.record ?? (listRecord?.id === shownId ? listRecord : undefined);

  return (
    <Sheet open={recordId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[min(calc(100vw-3rem),60rem)] data-[side=right]:sm:max-w-none"
      >
        {record ? (
          <RecordContent
            contract={contract}
            record={record}
            activity={detail.data?.activity}
            isLoadingDetail={detail.isPending}
          />
        ) : detail.isError ? (
          <DrawerMessage title="This record could not be loaded" onRetry={() => detail.refetch()} />
        ) : (
          <DrawerSkeleton />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface RecordContentProps {
  contract: ResourceContract;
  record: ResourceRecord;
  activity: ActivityEntry[] | undefined;
  isLoadingDetail: boolean;
}

function RecordContent({ contract, record, activity, isLoadingDetail }: RecordContentProps) {
  const statusField = contract.statusField ? getField(contract, contract.statusField) : undefined;
  const highlights = (contract.detail.highlights ?? [])
    .map((key) => getField(contract, key))
    .filter((field): field is FieldDefinition => field !== undefined);
  const everydayActions = contract.actions.filter((action) => action.tone !== "danger");
  const dangerActions = contract.actions.filter((action) => action.tone === "danger");

  return (
    <>
      <SheetHeader className="gap-3 border-b px-5 pt-5 pb-4 pr-14 sm:px-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
            {contract.labelSingular} <span className="text-foreground">#{record.id}</span>
          </span>
          {statusField ? <FieldValue field={statusField} value={record[statusField.key]} /> : null}
        </div>
        <SheetTitle className="text-xl leading-tight font-semibold tracking-tight sm:text-2xl">
          {String(record[contract.titleField] ?? record.id)}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Details and actions for {contract.labelSingular.toLowerCase()} {record.id}
        </SheetDescription>
      </SheetHeader>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
        {highlights.length > 0 ? (
          <dl className="grid grid-cols-3 divide-x border-b">
            {highlights.map((field) => (
              <div key={field.key} className="flex min-w-0 flex-col gap-1.5 px-3 py-4 first:pl-5 sm:px-7 sm:first:pl-7">
                <dt className="font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">
                  {field.label}
                </dt>
                <dd className="text-base font-medium sm:text-lg [&_.font-mono]:text-base sm:[&_.font-mono]:text-lg">
                  <FieldValue field={field} value={record[field.key]} variant="detail" />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <Tabs defaultValue="details" className="gap-0">
          <div className="sticky top-0 z-10 border-b bg-popover px-5 sm:px-7">
            <TabsList variant="line" className="h-11 gap-4 p-0">
              <TabsTrigger value="details" className="flex-none px-0">Details</TabsTrigger>
              <TabsTrigger value="activity" className="flex-none px-0">Activity</TabsTrigger>
              <TabsTrigger value="notes" className="flex-none px-0">Notes</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="flex flex-col gap-7 px-5 py-6 sm:px-7">
            {contract.detail.sections.map((section) => (
              <section key={section.key} aria-labelledby={`section-${section.key}`}>
                <h3
                  id={`section-${section.key}`}
                  className="mb-1 flex items-center gap-3 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase after:h-px after:flex-1 after:bg-border"
                >
                  {section.label}
                </h3>
                <dl className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                  {section.fields.map((key) => {
                    const field = getField(contract, key);
                    if (!field) return null;
                    return <DetailField key={key} field={field} value={record[key]} />;
                  })}
                </dl>
              </section>
            ))}
          </TabsContent>

          <TabsContent value="activity" className="px-5 py-6 sm:px-7">
            {isLoadingDetail ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-10" />
                ))}
              </div>
            ) : (
              <ActivityList entries={activity ?? []} />
            )}
          </TabsContent>

          <TabsContent value="notes" className="px-5 py-10 text-center sm:px-7">
            <p className="text-sm font-medium">No notes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Notes are shared with every admin who can open this record.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {contract.actions.length > 0 ? (
        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-muted/50 px-5 py-3 sm:px-7">
          {everydayActions.map((action) => (
            <ActionButton key={action.key} resource={contract.key} recordId={record.id} action={action} />
          ))}
          {/* Dangerous actions sit apart on the right, away from the everyday ones. */}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {dangerActions.map((action) => (
              <ActionButton key={action.key} resource={contract.key} recordId={record.id} action={action} />
            ))}
          </div>
        </footer>
      ) : null}
    </>
  );
}

function DetailField({ field, value }: { field: FieldDefinition; value: unknown }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-dashed py-2">
      <dt className="shrink-0 text-sm text-muted-foreground">{field.label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-right text-sm">
        <FieldValue field={field} value={value} variant="detail" />
        {field.masked && value ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => toast.info("Revealing a masked value needs a permission and is logged. Not connected yet.")}
          >
            <EyeIcon />
            Reveal
          </Button>
        ) : null}
      </dd>
    </div>
  );
}

interface ActionButtonProps {
  resource: string;
  recordId: string;
  action: ActionDefinition;
}

function ActionButton({ resource, recordId, action }: ActionButtonProps) {
  const runAction = useRunRecordAction(resource);
  const Icon = (action.icon && ACTION_ICONS[action.icon]) || CircleDotIcon;
  const isDanger = action.tone === "danger";

  // TODO(actions): dangerous and money actions must first ask for a reason and a
  // confirmation (and show risk flags). That dialog comes with the real action contract.
  const handleClick = () =>
    runAction.mutate(
      { recordId, actionKey: action.key },
      {
        onSuccess: (result) => toast.success(result.message),
        onError: (error) => toast.error(getApiErrorMessage(error)),
      },
    );

  return (
    <Button
      variant={isDanger ? "destructive" : "outline"}
      className={isDanger ? undefined : "bg-card"}
      disabled={runAction.isPending}
      onClick={handleClick}
    >
      <Icon className={runAction.isPending ? "animate-pulse" : undefined} />
      {action.label}
    </Button>
  );
}

function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No activity recorded.</p>;
  }
  return (
    <ol className="relative flex flex-col gap-5 before:absolute before:inset-y-1.5 before:left-[3px] before:w-px before:bg-border">
      {entries.map((entry) => (
        <li key={entry.id} className="relative pl-6">
          <span aria-hidden className="absolute top-1.5 left-0 size-[7px] rounded-full bg-foreground ring-4 ring-popover" />
          <p className="text-sm">{entry.summary}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {entry.actor} · {formatDate(entry.at)} {formatTime(entry.at)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function DrawerSkeleton() {
  return (
    <>
      <SheetHeader className="gap-3 border-b px-5 pt-5 pb-4 sm:px-7">
        <SheetTitle className="sr-only">Loading record</SheetTitle>
        <SheetDescription className="sr-only">The record is loading.</SheetDescription>
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

function DrawerMessage({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>It may have been removed, or the request failed.</SheetDescription>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
