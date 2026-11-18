import { EyeOffIcon } from "lucide-react";
import { cn } from "cn";

import { formatCountry, formatDate, formatMoney, formatNumber, formatTime, initials } from "@/lib/format";
import type { FieldDefinition, MoneyValue, PersonValue } from "../types";
import { StatusBadge } from "./status-badge";

interface FieldValueProps {
  field: FieldDefinition;
  value: unknown;
  /** `cell` is the compact table rendering, `detail` the roomier drawer rendering. */
  variant?: "cell" | "detail";
}

function Empty() {
  return <span className="text-muted-foreground/60">—</span>;
}

function PersonAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[0.625rem] font-medium text-secondary-foreground"
    >
      {initials(name)}
    </span>
  );
}

/**
 * Renders one field value according to its field type. This is the single place that
 * maps the contract's field types to UI: supporting a new field type means adding a case
 * here, and every list and drawer picks it up.
 */
export function FieldValue({ field, value, variant = "cell" }: FieldValueProps) {
  if (value === null || value === undefined || value === "") return <Empty />;

  switch (field.type) {
    case "id":
      return <span className="font-mono text-[0.8125rem] font-medium tracking-tight">{String(value)}</span>;

    case "status": {
      const option = field.options?.find((entry) => entry.value === value);
      return <StatusBadge label={option?.label ?? String(value)} tone={option?.tone} />;
    }

    case "money":
      return <span className="font-mono text-[0.8125rem] tabular-nums">{formatMoney(value as MoneyValue)}</span>;

    case "number":
      return <span className="font-mono text-[0.8125rem] tabular-nums">{formatNumber(Number(value))}</span>;

    case "datetime": {
      const iso = String(value);
      return (
        <time dateTime={iso} className="whitespace-nowrap">
          {formatDate(iso)}
          <span className="ml-1.5 font-mono text-xs text-muted-foreground tabular-nums">{formatTime(iso)}</span>
        </time>
      );
    }

    case "person": {
      const person = value as PersonValue;
      return (
        <span className="inline-flex min-w-0 items-center gap-2">
          <PersonAvatar name={person.name} />
          <span className="truncate">{person.name}</span>
          {variant === "detail" && person.detail ? (
            <span className="text-xs text-muted-foreground">{person.detail}</span>
          ) : null}
        </span>
      );
    }

    case "country": {
      const code = String(value);
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded-sm border px-1 font-mono text-[0.625rem] font-medium text-muted-foreground">
            {code}
          </span>
          {variant === "detail" ? formatCountry(code) : null}
        </span>
      );
    }

    case "text":
    default:
      return (
        <span
          className={cn(
            "inline-flex min-w-0 items-center gap-1.5",
            field.masked && "font-mono text-[0.8125rem] text-muted-foreground",
          )}
        >
          {field.masked ? <EyeOffIcon aria-hidden className="size-3.5 shrink-0" /> : null}
          <span className={cn(variant === "cell" && "block max-w-72 truncate")}>{String(value)}</span>
        </span>
      );
  }
}
