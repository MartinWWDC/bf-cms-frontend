"use client";

import { type FormEvent, useRef, useState } from "react";
import { PaperclipIcon, PencilIcon, PinIcon, PinOffIcon, Trash2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "cn";

import { ErrorState } from "@/components/error-state";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFormat } from "@/i18n/use-format";
import { useErrorToast } from "@/lib/api/use-error-message";
import type { AdminRef, RecordId } from "@/lib/api/types";

import { useCreateNote, useDeleteNote, usePinNote, useUpdateNote } from "../mutations";
import { useNotes } from "../queries";
import type { Contract, Note } from "../types";
import { StaffPicker } from "./pickers";

/** Limits of the API (`conventions.md`, Notes). */
const MAX_BODY = 20_000;
const MAX_MENTIONS = 20;
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILES = ".jpg,.jpeg,.png,.gif,.webp,.heic,.pdf,.txt,.csv,.xlsx,.xls,.docx,.doc,.eml,.msg";

interface NotesPanelProps {
  contract: Contract;
  recordId: RecordId;
  onOpenRecord: (resource: string, id: RecordId) => void;
  /** Text to start a new note with, e.g. from an assistant proposal. */
  draft?: string;
}

/**
 * Shared notes of a record: pinned first, then newest. The feed also holds the notes of
 * linked records, marked with where they come from. Only the author may edit or delete.
 */
export function NotesPanel({ contract, recordId, onOpenRecord, draft }: NotesPanelProps) {
  const t = useTranslations("resources.notes");
  const { can_write: canWrite, linked } = contract.collaboration.notes;
  const [showLinked, setShowLinked] = useState(true);
  const notes = useNotes(contract.key, recordId, showLinked);
  const entries = notes.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="flex flex-col gap-5 px-5 py-6 sm:px-7">
      {canWrite ? <NoteComposer resource={contract.key} recordId={recordId} draft={draft} /> : null}

      {linked.length > 0 ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={showLinked} onCheckedChange={(checked) => setShowLinked(checked === true)} />
          {t("showLinked", { resources: linked.map((link) => link.label).join(", ") })}
        </label>
      ) : null}

      {notes.isError ? (
        <ErrorState title={t("loadFailed")} error={notes.error} onRetry={() => notes.refetch()} className="min-h-40" />
      ) : notes.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : entries.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm font-medium">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((note) => (
            <NoteItem
              key={note.id}
              resource={contract.key}
              recordId={recordId}
              note={note}
              canWrite={canWrite}
              onOpenRecord={onOpenRecord}
            />
          ))}
        </ul>
      )}

      {notes.hasNextPage ? (
        <Button variant="outline" className="self-center" disabled={notes.isFetchingNextPage} onClick={() => notes.fetchNextPage()}>
          {t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}

function MentionChips({ mentions, onRemove }: { mentions: AdminRef[]; onRemove?: (id: number) => void }) {
  const t = useTranslations("resources.notes");
  if (mentions.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1">
      {mentions.map((mention) => (
        <li key={mention.id} className="inline-flex items-center gap-1 rounded-full border bg-card py-0.5 pr-1 pl-2 text-xs">
          @{mention.name}
          {onRemove ? (
            <button
              type="button"
              aria-label={t("removeMention", { name: mention.name })}
              onClick={() => onRemove(mention.id)}
              className="flex size-4 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon className="size-3" />
            </button>
          ) : (
            <span className="w-1" />
          )}
        </li>
      ))}
    </ul>
  );
}

function NoteComposer({ resource, recordId, draft }: { resource: string; recordId: RecordId; draft?: string }) {
  const t = useTranslations("resources.notes");
  const format = useFormat();
  const toastError = useErrorToast();
  const create = useCreateNote(resource, recordId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState(draft ?? "");
  const [mentions, setMentions] = useState<AdminRef[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const addFiles = (list: FileList | null) => {
    const added = [...(list ?? [])];
    if (added.some((file) => file.size > MAX_FILE_BYTES)) {
      toast.error(t("fileTooLarge", { size: format.fileSize(MAX_FILE_BYTES) }));
    }
    const next = [...files, ...added.filter((file) => file.size <= MAX_FILE_BYTES)];
    if (next.length > MAX_FILES) toast.error(t("tooManyFiles", { count: MAX_FILES }));
    setFiles(next.slice(0, MAX_FILES));
    if (fileInput.current) fileInput.current.value = "";
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    create.mutate(
      { body: body.trim(), format: "plain", mentions: mentions.map((mention) => mention.id), attachments: files },
      {
        onSuccess: () => {
          setBody("");
          setMentions([]);
          setFiles([]);
        },
        onError: toastError,
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
      <Textarea
        value={body}
        maxLength={MAX_BODY}
        rows={3}
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        disabled={create.isPending}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit(event);
        }}
        className="bg-card"
      />
      <MentionChips mentions={mentions} onRemove={(id) => setMentions(mentions.filter((mention) => mention.id !== id))} />
      {files.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-2">
              <PaperclipIcon aria-hidden className="size-3 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="font-mono text-muted-foreground">{format.fileSize(file.size)}</span>
              <button
                type="button"
                aria-label={t("removeFile", { name: file.name })}
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                className="text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <StaffPicker
          size="sm"
          className="w-44"
          value={null}
          placeholder={t("mention")}
          disabled={create.isPending || mentions.length >= MAX_MENTIONS}
          onChange={(id, name) => {
            if (typeof id !== "number" || mentions.some((mention) => mention.id === id)) return;
            setMentions([...mentions, { id, name: name ?? `#${id}` }]);
          }}
        />
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept={ACCEPTED_FILES}
          onChange={(event) => addFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={create.isPending || files.length >= MAX_FILES}
          onClick={() => fileInput.current?.click()}
        >
          <PaperclipIcon />
          {t("attach")}
        </Button>
        <Button type="submit" size="sm" className="ml-auto" disabled={create.isPending || !body.trim()}>
          {create.isPending ? t("adding") : t("add")}
        </Button>
      </div>
    </form>
  );
}

function NoteItem({
  resource,
  recordId,
  note,
  canWrite,
  onOpenRecord,
}: {
  resource: string;
  recordId: RecordId;
  note: Note;
  canWrite: boolean;
  onOpenRecord: (resource: string, id: RecordId) => void;
}) {
  const t = useTranslations("resources.notes");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const toastError = useErrorToast();
  // A linked record's note belongs to that record: it is changed through its own address.
  const ownerResource = note.origin ? note.resource : resource;
  const ownerId = note.origin ? note.record_id : recordId;
  const update = useUpdateNote(ownerResource, ownerId);
  const remove = useDeleteNote(ownerResource, ownerId);
  const pin = usePinNote(ownerResource, ownerId);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [body, setBody] = useState(note.body);
  const busy = update.isPending || remove.isPending || pin.isPending;
  const iconButton =
    "flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 [&_svg]:size-3.5";

  return (
    <li className={cn("rounded-lg border bg-card p-3", note.pinned && "border-brand/40")}>
      <header className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{note.author?.name ?? t("unknownAuthor")}</span>
        {note.created_at ? <time dateTime={note.created_at}>{format.dateTime(note.created_at)}</time> : null}
        {note.edited_at ? <span>{t("edited")}</span> : null}
        {note.pinned ? (
          <span className="inline-flex items-center gap-1 text-foreground">
            <PinIcon aria-hidden className="size-3 text-brand" />
            {t("pinned")}
          </span>
        ) : null}
        {note.origin ? (
          <button
            type="button"
            onClick={() => note.origin && onOpenRecord(note.origin.resource, note.origin.record_id)}
            className="rounded-sm border px-1.5 py-0.5 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {note.origin.label}
          </button>
        ) : null}
        <span className="ml-auto flex items-center gap-0.5">
          {canWrite ? (
            <button
              type="button"
              className={iconButton}
              disabled={busy}
              aria-label={note.pinned ? t("unpin") : t("pin")}
              title={note.pinned ? t("unpin") : t("pin")}
              onClick={() => pin.mutate({ noteId: note.id, pinned: !note.pinned }, { onError: toastError })}
            >
              {note.pinned ? <PinOffIcon /> : <PinIcon />}
            </button>
          ) : null}
          {note.own && canWrite ? (
            <>
              <button
                type="button"
                className={iconButton}
                disabled={busy}
                aria-label={t("edit")}
                title={t("edit")}
                onClick={() => {
                  setBody(note.body);
                  setEditing(true);
                }}
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                className={iconButton}
                disabled={busy}
                aria-label={t("delete")}
                title={t("delete")}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2Icon />
              </button>
            </>
          ) : null}
        </span>
      </header>

      {editing ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate(
              { noteId: note.id, input: { body: body.trim(), format: note.format } },
              { onSuccess: () => setEditing(false), onError: toastError },
            );
          }}
        >
          <Textarea value={body} maxLength={MAX_BODY} rows={3} onChange={(event) => setBody(event.target.value)} aria-label={t("edit")} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={update.isPending || !body.trim()}>
              {tCommon("save")}
            </Button>
          </div>
        </form>
      ) : note.format === "rich" ? (
        <RichText html={note.body} />
      ) : (
        // Plain notes are text, never HTML.
        <p className="text-sm break-words whitespace-pre-wrap">{note.body}</p>
      )}

      {confirmDelete ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm">
          <span className="mr-auto">{t("deleteConfirm")}</span>
          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={remove.isPending}
            onClick={() => remove.mutate(note.id, { onError: toastError })}
          >
            {t("delete")}
          </Button>
        </div>
      ) : null}

      {note.mentions.length > 0 ? (
        <div className="mt-2">
          <MentionChips mentions={note.mentions} />
        </div>
      ) : null}
      {note.attachments.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {note.attachments.map((file) => (
            <li key={file.id}>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-sm underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PaperclipIcon aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{format.fileSize(file.size)}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
