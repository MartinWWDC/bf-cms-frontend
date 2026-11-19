"use client";

import type { ReactNode } from "react";
import { CheckIcon, ExternalLinkIcon, EyeOffIcon, FileIcon, MinusIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "cn";

import { RichText } from "@/components/rich-text";
import { StatusBadge } from "@/components/status-badge";
import { useFormat } from "@/i18n/use-format";
import {
  isMasked,
  isMoney,
  isReference,
  type RecordId,
  type StoredFile,
  type StoredImage,
  type Translated,
} from "@/lib/api/types";
import { initials } from "@/lib/format";
import { htmlToText } from "@/lib/sanitize-html";

import type { ActionInput, Field } from "../types";

/** What `FieldValue` needs to know about a field. Action inputs have the same parts. */
export type FieldLike = Pick<Field, "name" | "type" | "config"> &
  Partial<Pick<Field, "translated" | "sensitive">> &
  Partial<Pick<ActionInput, "label">>;

interface FieldValueProps {
  field: FieldLike;
  value: unknown;
  /** `cell` is the compact table rendering, `detail` the roomier drawer rendering. */
  variant?: "cell" | "detail";
  /** Opens a linked record. Without it a linked record is plain text. */
  onOpenRecord?: (resource: string, id: RecordId) => void;
}

const monoClass = "font-mono text-[0.8125rem] tabular-nums";

function Empty() {
  return <span className="text-muted-foreground/60">—</span>;
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[0.625rem] font-medium text-secondary-foreground"
    >
      {initials(name)}
    </span>
  );
}

/** The text of a translated value in the admin's language, else English, else any language. */
export function pickTranslation(value: Translated, locale: string): string | null {
  return value[locale] ?? value.en ?? Object.values(value).find((text) => text) ?? null;
}

function isEmptyValue(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && !Array.isArray(value) && value !== null && Object.keys(value).length === 0)
  );
}

/**
 * Renders one value according to its field type. This is the single place that maps the
 * field-type catalogue (`field-types.md` section 2) to UI: every list, drawer, related
 * list and preview uses it, so supporting a new type means adding one case here.
 * A type this version does not know renders as text.
 */
export function FieldValue({ field, value, variant = "cell", onOpenRecord }: FieldValueProps) {
  const format = useFormat();
  const locale = useLocale();
  const t = useTranslations("resources.values");
  const isCell = variant === "cell";

  if (isEmptyValue(value)) return <Empty />;

  // A sensitive value is always masked, whatever its type.
  if (isMasked(value)) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-muted-foreground", monoClass)}>
        <EyeOffIcon aria-hidden className="size-3.5 shrink-0" />
        <span>{value.preview}</span>
        <span className="sr-only">{t("masked")}</span>
      </span>
    );
  }

  // A translated value has one entry per language; lists show the admin's language.
  if (field.translated && typeof value === "object" && !Array.isArray(value)) {
    if (field.type === "json") {
      const entry = (value as Record<string, unknown>)[locale] ?? (value as Record<string, unknown>).en;
      return isEmptyValue(entry) ? <Empty /> : <CodeValue text={JSON.stringify(entry, null, isCell ? 0 : 2)} isCell={isCell} />;
    }
    const text = pickTranslation(value as Translated, locale);
    if (!text) return <Empty />;
    return <FieldValue field={{ ...field, translated: false }} value={text} variant={variant} />;
  }

  switch (field.type) {
    case "id":
      return <span className="font-mono text-[0.8125rem] font-medium tracking-tight">{String(value)}</span>;

    case "enum": {
      const option = field.config.options?.find((entry) => String(entry.value) === String(value));
      return <StatusBadge label={option?.label ?? String(value)} tone={option?.tone} />;
    }

    case "money":
      if (!isMoney(value)) return <span className={monoClass}>{String(value)}</span>;
      return <span className={monoClass}>{format.money(value)}</span>;

    case "number": {
      const number = Number(value);
      if (!Number.isFinite(number)) return <Text value={String(value)} isCell={isCell} />;
      return (
        <span className={monoClass}>
          {format.number(number)}
          {field.config.unit ? <span className="ml-1 text-muted-foreground">{field.config.unit}</span> : null}
        </span>
      );
    }

    case "boolean":
      return value ? (
        <span className="inline-flex items-center gap-1.5">
          <CheckIcon aria-hidden className="size-4 text-tone-success" />
          <span className={cn(isCell && "sr-only")}>{t("yes")}</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <XIcon aria-hidden className="size-4" />
          <span className={cn(isCell && "sr-only")}>{t("no")}</span>
        </span>
      );

    case "boolean_group": {
      const flags = value as Record<string, boolean>;
      const options = field.config.options ?? Object.keys(flags).map((key) => ({ value: key, label: key }));
      const on = options.filter((option) => flags[option.value]);
      if (on.length === 0) return <MinusIcon aria-hidden className="size-4 text-muted-foreground/60" />;
      return (
        <span className="inline-flex flex-wrap gap-1">
          {on.map((option) => (
            <span key={option.value} className="rounded-sm border bg-card px-1.5 py-0.5 text-xs">
              {option.label}
            </span>
          ))}
        </span>
      );
    }

    case "date":
      return <time dateTime={String(value)} className="whitespace-nowrap">{format.date(String(value))}</time>;

    case "datetime": {
      const iso = String(value);
      if (Number.isNaN(new Date(iso).getTime())) return <Text value={iso} isCell={isCell} />;
      return (
        <time dateTime={iso} title={format.dateTime(iso)} className="whitespace-nowrap">
          {field.config.relative && isCell ? (
            format.relative(iso)
          ) : (
            <>
              {format.date(iso)}
              <span className="ml-1.5 font-mono text-xs text-muted-foreground tabular-nums">{format.time(iso)}</span>
            </>
          )}
        </time>
      );
    }

    case "country": {
      const code = String(value);
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded-sm border px-1 font-mono text-[0.625rem] font-medium text-muted-foreground">
            {code}
          </span>
          {isCell ? null : format.country(code)}
        </span>
      );
    }

    case "locale": {
      const code = String(value);
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded-sm border px-1 font-mono text-[0.625rem] font-medium text-muted-foreground uppercase">
            {code}
          </span>
          {isCell ? null : format.language(code)}
        </span>
      );
    }

    case "email":
      return (
        <a href={`mailto:${String(value)}`} onClick={(event) => event.stopPropagation()} className={linkClass}>
          <Text value={String(value)} isCell={isCell} />
        </a>
      );

    case "phone":
      return (
        <a href={`tel:${String(value)}`} onClick={(event) => event.stopPropagation()} className={cn(linkClass, monoClass)}>
          {String(value)}
        </a>
      );

    case "url": {
      const url = String(value);
      if (!/^https?:\/\//i.test(url)) return <Text value={url} isCell={isCell} />;
      return (
        <a
          href={url}
          target={field.config.external === false ? undefined : "_blank"}
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className={cn(linkClass, "inline-flex min-w-0 items-center gap-1")}
        >
          <Text value={url.replace(/^https?:\/\//i, "")} isCell={isCell} />
          <ExternalLinkIcon aria-hidden className="size-3 shrink-0 opacity-60" />
        </a>
      );
    }

    case "rich_text":
      return isCell ? <Text value={htmlToText(String(value))} isCell /> : <RichText html={String(value)} />;

    case "long_text":
      return isCell ? (
        <Text value={String(value).replace(/\s+/g, " ")} isCell />
      ) : (
        <span className="break-words whitespace-pre-wrap">{String(value)}</span>
      );

    case "code":
    case "json": {
      const text = typeof value === "string" ? value : JSON.stringify(value, null, isCell ? 0 : 2);
      return <CodeValue text={text} isCell={isCell} />;
    }

    case "key_value": {
      const entries = Object.entries(value as Record<string, unknown>);
      if (isCell) return <Text value={entries.map(([key, entry]) => `${key}: ${String(entry)}`).join(", ")} isCell />;
      return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-left">
          {entries.map(([key, entry]) => (
            <div key={key} className="contents">
              <dt className="font-mono text-xs text-muted-foreground">{key}</dt>
              <dd className="break-words">{String(entry)}</dd>
            </div>
          ))}
        </dl>
      );
    }

    case "password":
      return <span className="text-muted-foreground">••••••••</span>;

    case "file": {
      const file = value as StoredFile;
      return (
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className={cn(linkClass, "inline-flex min-w-0 items-center gap-1.5")}
        >
          <FileIcon aria-hidden className="size-3.5 shrink-0" />
          <Text value={file.name} isCell={isCell} />
          {typeof file.size === "number" ? (
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{format.fileSize(file.size)}</span>
          ) : null}
        </a>
      );
    }

    case "image":
      return <Thumbnails images={[value as StoredImage]} isCell={isCell} more={(count) => t("moreImages", { count })} />;

    case "images":
      return (
        <Thumbnails
          images={[...(value as StoredImage[])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))}
          isCell={isCell}
          more={(count) => t("moreImages", { count })}
        />
      );

    case "relation_one":
    case "admin": {
      const title = referenceTitle(value);
      if (title === null) return <Text value={String(value)} isCell={isCell} />;
      const reference = isReference(value) ? value : null;
      const content = (
        <span className="inline-flex min-w-0 items-center gap-2">
          {field.type === "admin" ? <Avatar name={title} /> : null}
          <Text value={title} isCell={isCell} />
        </span>
      );
      if (!reference || !onOpenRecord || field.type === "admin") return content;
      return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenRecord(reference.resource, reference.id);
          }}
          className={cn(linkClass, "min-w-0 text-left")}
        >
          {content}
        </button>
      );
    }

    case "relation_many":
      // Not part of the record; loaded as a related list.
      return <Empty />;

    default:
      return typeof value === "object" ? (
        <CodeValue text={JSON.stringify(value)} isCell={isCell} />
      ) : (
        <Text value={String(value)} isCell={isCell} />
      );
  }
}

const linkClass =
  "rounded-sm underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring";

/** A linked record or an admin: `{ id, resource, title }` or `{ id, name }`. */
function referenceTitle(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const entry = value as { id?: unknown; title?: unknown; name?: unknown };
  if (typeof entry.title === "string" && entry.title) return entry.title;
  if (typeof entry.name === "string" && entry.name) return entry.name;
  return entry.id === undefined ? null : `#${String(entry.id)}`;
}

function Text({ value, isCell }: { value: string; isCell: boolean }): ReactNode {
  return isCell ? (
    <span className="block max-w-72 truncate" title={value.length > 40 ? value : undefined}>
      {value}
    </span>
  ) : (
    <span className="break-words">{value}</span>
  );
}

function CodeValue({ text, isCell }: { text: string; isCell: boolean }) {
  return isCell ? (
    <span className="block max-w-72 truncate font-mono text-xs text-muted-foreground">{text}</span>
  ) : (
    <pre className="scrollbar-slim max-h-72 w-full overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs">
      {text}
    </pre>
  );
}

function Thumbnails({
  images,
  isCell,
  more,
}: {
  images: StoredImage[];
  isCell: boolean;
  more: (count: number) => string;
}) {
  const shown = images.slice(0, isCell ? 1 : 12);
  const rest = images.length - shown.length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {shown.map((image, index) => (
        <a
          key={image.id ?? index}
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="overflow-hidden rounded-md border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* Private storage links are signed and short-lived, so the image optimiser cannot be used. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.thumb_url ?? image.url}
            alt={image.alt ?? ""}
            loading="lazy"
            className={cn("object-cover", isCell ? "size-8" : "size-20")}
          />
        </a>
      ))}
      {rest > 0 ? <span className="font-mono text-xs text-muted-foreground">{more(rest)}</span> : null}
    </span>
  );
}
