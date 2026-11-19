"use client";

import { CheckIcon, EyeOffIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { useFormat } from "@/i18n/use-format";
import { isMasked, isMoney } from "@/lib/api/types";

import type { FactValue } from "../types";

/**
 * Keys of the subject and user data the review screen sends
 * (`AdSubjects`, `UserSubjects`, `BusinessAccountSubjects`, `ReportSubjects`,
 * `UserProfileQuery::summary` on the backend). A key added later shows under its own name.
 */
const KNOWN_KEYS = [
  "description", "price", "condition", "model_year", "location", "activated", "requires_approval", "is_bought",
  "deleted", "step", "created_at", "published_at", "provider", "sign_up_country", "sign_up_city", "last_login_ip",
  "user_agent", "phone_verification_required", "phone_number_verified_at", "suspended_at", "vat_number",
  "tax_number", "codice", "website_url", "facebook_url", "instagram_url", "is_shop", "is_rental",
  "is_professional", "is_refurbisher", "is_admin_approved", "opening_hours", "address", "text", "is_suspicious",
  "name", "email", "phone_number", "account_type", "is_business", "is_suspended", "email_verified",
  "phone_verified", "phone_blacklisted", "country", "language", "average_rating", "review_count", "last_login_at",
] as const;

/** Shown elsewhere on the screen (header, gallery, own block), not as a fact row. */
const SKIPPED: ReadonlySet<string> = new Set(["type", "id", "resource", "title", "images", "description", "text"]);

const COUNTRY_KEYS: ReadonlySet<string> = new Set(["country", "sign_up_country"]);

function isKnownKey(key: string): key is (typeof KNOWN_KEYS)[number] {
  return (KNOWN_KEYS as readonly string[]).includes(key);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

/** One value, shown by what it is. Text written by users stays text; nothing is rendered as HTML. */
export function FactText({ name, value }: { name: string; value: FactValue | undefined }) {
  const t = useTranslations("moderation");
  const format = useFormat();

  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground/60">—</span>;
  if (isMasked(value)) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[0.8125rem] text-muted-foreground">
        <EyeOffIcon aria-hidden className="size-3.5" />
        {value.preview}
        <span className="sr-only">{t("masked")}</span>
      </span>
    );
  }
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center gap-1">
        <CheckIcon aria-hidden className="size-4 text-tone-success" />
        {t("yes")}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <XIcon aria-hidden className="size-4" />
        {t("no")}
      </span>
    );
  }
  if (isMoney(value)) return <span className="font-mono tabular-nums">{format.money(value)}</span>;
  if (typeof value === "number") return <span className="font-mono tabular-nums">{format.number(value)}</span>;
  if (typeof value === "string") {
    if (ISO_DATE.test(value)) return <time dateTime={value}>{value.length <= 10 ? format.date(value) : format.dateTime(value)}</time>;
    if (COUNTRY_KEYS.has(name) && value.length === 2) return <span>{format.country(value)}</span>;
    if (name === "language" && value.length === 2) return <span>{format.language(value)}</span>;
    return <span className="break-words">{value}</span>;
  }
  if (Array.isArray(value)) {
    return <span className="break-words">{value.map((entry) => (typeof entry === "object" ? JSON.stringify(entry) : String(entry))).join(", ")}</span>;
  }
  // A small object: an address, a location, opening hours.
  const parts = Object.entries(value).filter(([, entry]) => entry !== null && entry !== "");
  if (parts.every(([, entry]) => typeof entry !== "object")) {
    return (
      <span className="break-words">
        {parts
          .map(([key, entry]) => (key === "country" && typeof entry === "string" && entry.length === 2 ? format.country(entry) : String(entry)))
          .join(", ")}
      </span>
    );
  }
  return <span className="font-mono text-xs break-words">{JSON.stringify(value)}</span>;
}

interface FactsProps {
  values: Record<string, FactValue | undefined>;
  className?: string;
}

/** Label and value rows for the data of a subject or a user. */
export function Facts({ values, className }: FactsProps) {
  const t = useTranslations("moderation");
  const entries = Object.entries(values).filter(([key]) => !SKIPPED.has(key));

  return (
    <dl className={cn("grid grid-cols-1 gap-x-10 sm:grid-cols-2", className)}>
      {entries.map(([key, value]) => (
        <div key={key} className="flex min-h-10 items-center justify-between gap-4 border-b border-dashed py-2">
          <dt className="shrink-0 text-sm text-muted-foreground">
            {isKnownKey(key) ? t(`fields.${key}`) : key.replaceAll("_", " ")}
          </dt>
          <dd className="min-w-0 text-right text-sm">
            <FactText name={key} value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
