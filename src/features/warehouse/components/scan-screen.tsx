"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { MapPinIcon, PackageIcon, PrinterIcon, ScanLineIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { ErrorState } from "@/components/error-state";
import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionDialog, type ActionRun } from "@/components/resource/action-dialog";
import { useResourceContract } from "@/features/resources/queries";
import { useFormat } from "@/i18n/use-format";
import { getApiErrorStatus } from "@/lib/api/client";
import { recordHref, routes } from "@/lib/routes";

import { useWarehouseScan, warehouseKeys } from "../queries";
import { CODE_PATTERN, type ScannedItem, type ScannedLocation } from "../types";

const STOCK_ITEMS = "stock_items";
const MAX_RECENT = 8;

interface RecentScan {
  code: string;
  /** What the code turned out to be, once known. */
  label: string | null;
}

/**
 * Scan page for the warehouse tablet. One big field keeps the focus, so a hardware scanner
 * (which types the code and presses Enter) works without touching the screen. A scan shows
 * the item and/or the location with that code; a movement of the item runs through the
 * normal action dialog, prefilled with the location scanned last.
 */
export function ScanScreen() {
  const t = useTranslations("warehouse");
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [recent, setRecent] = useState<RecentScan[]>([]);
  /** Code of the location scanned last in this visit: the place a movement goes to or comes from. */
  const [lastLocation, setLastLocation] = useState<string | null>(null);
  const [run, setRun] = useState<ActionRun | null>(null);
  const scan = useWarehouseScan(code);
  const contract = useResourceContract(STOCK_ITEMS);
  const item = scan.data?.item ?? null;
  const location = scan.data?.location ?? null;

  // Keep the field ready for the next scan, also after a dialog closes.
  useEffect(() => {
    if (run === null) input.current?.focus();
  }, [run, scan.dataUpdatedAt]);

  // Remember what was scanned: the location for the next movement, and the list of last scans.
  // Done while rendering the new answer, so there is no extra effect pass.
  const [seen, setSeen] = useState(scan.data);
  if (scan.data && scan.data !== seen) {
    setSeen(scan.data);
    if (location) setLastLocation(location.code);
    const label = item?.name ?? location?.name ?? null;
    if (code && label !== null) {
      setRecent((current) => current.map((entry) => (entry.code === code ? { ...entry, label } : entry)));
    }
  }

  const lookUp = (next: string) => {
    const value = next.trim();
    if (!CODE_PATTERN.test(value)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft("");
    setRecent((current) => [{ code: value, label: null }, ...current.filter((entry) => entry.code !== value)].slice(0, MAX_RECENT));
    if (value === code) void queryClient.invalidateQueries({ queryKey: warehouseKeys.scan(value) });
    else setCode(value);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    lookUp(draft);
  };

  const startAction = (scanned: ScannedItem, key: string) => {
    const action = contract.data?.actions.find((entry) => entry.key === key);
    if (!action) return;
    const names = new Set(action.inputs.map((field) => field.name));
    const only = scanned.levels.length === 1 ? scanned.levels[0].location_code : null;
    const initialInput: Record<string, unknown> = {};
    if (names.has("to_location_code")) {
      if (lastLocation && lastLocation !== only) initialInput.to_location_code = lastLocation;
      if (names.has("from_location_code") && only) initialInput.from_location_code = only;
    } else if (names.has("from_location_code")) {
      initialInput.from_location_code = lastLocation ?? only;
    }
    if (names.has("location_code")) initialInput.location_code = lastLocation ?? only;
    setRun({
      resource: STOCK_ITEMS,
      resourceLabel: contract.data?.label ?? STOCK_ITEMS,
      action,
      target: { kind: "record", id: scanned.id },
      initialInput: Object.fromEntries(Object.entries(initialInput).filter(([, value]) => value != null)),
      // The stock changed: read the item again.
      onDone: () => void queryClient.invalidateQueries({ queryKey: warehouseKeys.scan(scanned.code) }),
    });
  };

  const status = scan.isError ? getApiErrorStatus(scan.error) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("scan.title")} description={t("scan.description")}>
        <Link href={routes.warehouseLabels} className={buttonVariants({ variant: "outline" })}>
          <PrinterIcon />
          {t("labels.title")}
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-5 px-4 pb-8 sm:px-6">
        <form onSubmit={submit} className="flex max-w-2xl flex-col gap-1.5" noValidate>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLineIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={input}
                autoFocus
                value={draft}
                maxLength={64}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="search"
                placeholder={t("scan.placeholder")}
                aria-label={t("scan.placeholder")}
                aria-invalid={invalid || undefined}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setInvalid(false);
                }}
                className="h-14 bg-card pl-11 font-mono text-lg tracking-wide"
              />
            </div>
            <Button type="submit" size="lg" className="h-14 px-6 text-base" disabled={draft.trim() === ""}>
              {t("scan.lookUp")}
            </Button>
          </div>
          {invalid ? (
            <p role="alert" className="text-sm text-destructive">
              {t("scan.invalidCode")}
            </p>
          ) : null}
          {lastLocation ? (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <MapPinIcon aria-hidden className="size-4" />
              {t.rich("scan.lastLocation", {
                code: lastLocation,
                mark: (chunks) => <span className="font-mono font-medium text-foreground">{chunks}</span>,
              })}
              <button
                type="button"
                className="underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setLastLocation(null)}
              >
                {t("scan.forgetLocation")}
              </button>
            </p>
          ) : null}
        </form>

        {code === null ? (
          <p className="max-w-2xl rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            {t("scan.empty")}
          </p>
        ) : scan.isPending ? (
          <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
            <Skeleton className="h-56" />
          </div>
        ) : scan.isError ? (
          status === 403 ? (
            <NoAccess />
          ) : status === 404 ? (
            <div role="alert" className="max-w-2xl rounded-lg border border-dashed px-4 py-8 text-center">
              <p className="font-medium">{t("scan.notFound")}</p>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{code}</p>
            </div>
          ) : (
            <ErrorState title={t("scan.loadFailed")} error={scan.error} onRetry={() => scan.refetch()} className="max-w-2xl" />
          )
        ) : (
          <div className={cn("grid max-w-6xl gap-4", item && location && "lg:grid-cols-2")}>
            {item ? (
              <ItemCard
                item={item}
                actionLabel={(key) => contract.data?.actions.find((entry) => entry.key === key)?.label ?? key.replaceAll("_", " ")}
                actionsReady={contract.data !== undefined}
                onAction={(key) => startAction(item, key)}
                onScan={lookUp}
              />
            ) : null}
            {location ? <LocationCard location={location} onScan={lookUp} /> : null}
            {!item && !location ? (
              <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                {t("scan.notFound")}
              </p>
            ) : null}
          </div>
        )}

        {recent.length > 0 ? (
          <section aria-label={t("scan.recent")} className="max-w-2xl">
            <h2 className="mb-2 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">{t("scan.recent")}</h2>
            <ul className="flex flex-wrap gap-2">
              {recent.map((entry) => (
                <li key={entry.code}>
                  <button
                    type="button"
                    onClick={() => lookUp(entry.code)}
                    className="flex h-11 items-center gap-2 rounded-lg border bg-card px-3 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-mono">{entry.code}</span>
                    {entry.label ? <span className="max-w-40 truncate text-muted-foreground">{entry.label}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <ActionDialog run={run} onClose={() => setRun(null)} />
    </div>
  );
}

const cardClass = "flex flex-col gap-4 rounded-xl border bg-card p-5";
const rowClass = "flex min-h-11 items-center justify-between gap-3 border-b border-dashed py-1.5 last:border-b-0";

function CodeButton({ code, onScan }: { code: string; onScan: (code: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onScan(code)}
      className="rounded-sm font-mono text-sm underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {code}
    </button>
  );
}

function ItemCard({
  item,
  actionLabel,
  actionsReady,
  onAction,
  onScan,
}: {
  item: ScannedItem;
  actionLabel: (key: string) => string;
  actionsReady: boolean;
  onAction: (key: string) => void;
  onScan: (code: string) => void;
}) {
  const t = useTranslations("warehouse");
  const format = useFormat();

  return (
    <article aria-label={t("item.title")} className={cardClass}>
      <header className="flex flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground uppercase">
          <PackageIcon aria-hidden className="size-4" />
          {t("item.title")}
          <span className="text-foreground normal-case">{item.code}</span>
          {item.is_active ? null : <StatusBadge label={t("inactive")} tone="neutral" />}
          {item.low_stock ? <StatusBadge label={t("item.lowStock")} tone="warning" /> : null}
        </p>
        <h2 className="font-heading text-2xl leading-tight font-semibold tracking-tight break-words">{item.name}</h2>
        <Link
          href={recordHref(STOCK_ITEMS, item.id)}
          className="self-start text-xs underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("item.open")}
        </Link>
      </header>

      <dl className="grid grid-cols-3 divide-x rounded-lg border">
        <div className="flex flex-col gap-1 px-3 py-2.5">
          <dt className="font-mono text-[0.625rem] tracking-wider text-muted-foreground uppercase">{t("item.onHand")}</dt>
          <dd className="font-heading text-3xl leading-none font-semibold tabular-nums">
            {format.number(item.quantity_on_hand)}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">{item.unit}</span>
          </dd>
        </div>
        <div className="flex flex-col gap-1 px-3 py-2.5">
          <dt className="font-mono text-[0.625rem] tracking-wider text-muted-foreground uppercase">{t("item.minimum")}</dt>
          <dd className="font-heading text-xl leading-none font-semibold tabular-nums">
            {item.min_quantity === null ? "—" : format.number(item.min_quantity)}
          </dd>
        </div>
        <div className="flex flex-col gap-1 px-3 py-2.5">
          <dt className="font-mono text-[0.625rem] tracking-wider text-muted-foreground uppercase">{t("item.kind")}</dt>
          <dd className="text-sm">{item.kind.replaceAll("_", " ")}</dd>
        </div>
      </dl>

      <section aria-label={t("item.locations")}>
        <h3 className="mb-1 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">{t("item.locations")}</h3>
        {item.levels.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("item.noLocations")}</p>
        ) : (
          <ul>
            {item.levels.map((level) => (
              <li key={level.location_id} className={rowClass}>
                <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                  <CodeButton code={level.location_code} onScan={onScan} />
                  <span className="truncate text-sm text-muted-foreground">{level.location_name}</span>
                </span>
                <span className="font-mono text-base font-medium tabular-nums">{format.number(level.quantity)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {item.actions.length > 0 ? (
        <section aria-label={t("item.movements")} className="flex flex-col gap-2 border-t pt-4">
          <h3 className="font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">{t("item.movements")}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {item.actions.map((key) => (
              <Button
                key={key}
                variant={key === "write_off" ? "destructive" : "outline"}
                size="lg"
                className="h-12 text-base"
                disabled={!actionsReady}
                onClick={() => onAction(key)}
              >
                {actionLabel(key)}
              </Button>
            ))}
          </div>
        </section>
      ) : (
        <p className="border-t pt-4 text-sm text-muted-foreground">{t("item.noMovements")}</p>
      )}
    </article>
  );
}

function LocationCard({ location, onScan }: { location: ScannedLocation; onScan: (code: string) => void }) {
  const t = useTranslations("warehouse");
  const format = useFormat();

  return (
    <article aria-label={t("location.title")} className={cardClass}>
      <header className="flex flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground uppercase">
          <MapPinIcon aria-hidden className="size-4" />
          {t("location.title")}
          <span className="text-foreground normal-case">{location.code}</span>
          {location.is_active ? null : <StatusBadge label={t("inactive")} tone="neutral" />}
        </p>
        <h2 className="font-heading text-2xl leading-tight font-semibold tracking-tight break-words">{location.name}</h2>
        <p className="text-sm text-muted-foreground">
          {location.warehouse.name} · {location.kind.replaceAll("_", " ")}
        </p>
        <Link
          href={recordHref("warehouse_locations", location.id)}
          className="self-start text-xs underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("location.open")}
        </Link>
      </header>

      <section aria-label={t("location.contents")}>
        <h3 className="mb-1 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">{t("location.contents")}</h3>
        {location.contents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("location.empty")}</p>
        ) : (
          <ul>
            {location.contents.map((entry) => (
              <li key={entry.item_id} className={rowClass}>
                <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                  <CodeButton code={entry.item_code} onScan={onScan} />
                  <span className="truncate text-sm text-muted-foreground">{entry.item_name}</span>
                </span>
                <span className="font-mono text-base font-medium tabular-nums">{format.number(entry.quantity)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
