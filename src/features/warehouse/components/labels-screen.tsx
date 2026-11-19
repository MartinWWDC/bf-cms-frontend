"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PrinterIcon, ScanLineIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { routes } from "@/lib/routes";

import { useWarehouseLabels } from "../queries";
import { MAX_LABELS, parseCodes, type WarehouseLabel } from "../types";

/**
 * Labels for item and location codes (`GET /warehouse/labels`), laid out for printing: on
 * paper only the labels remain, one per block. The codes are kept in the URL (`?codes=A,B`)
 * so a sheet can be opened again or linked.
 *
 * Must be rendered inside `<Suspense>`: it reads the codes from the URL.
 */
export function LabelsScreen() {
  const t = useTranslations("warehouse");
  const searchParams = useSearchParams();
  const codes = parseCodes(searchParams.get("codes") ?? "");
  const [draft, setDraft] = useState(codes.join("\n"));
  const labels = useWarehouseLabels(codes);
  const found = new Set((labels.data ?? []).map((label) => label.code));
  const missing = labels.data ? codes.filter((code) => !found.has(code)) : [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = parseCodes(draft);
    const url = next.length > 0 ? `${window.location.pathname}?codes=${encodeURIComponent(next.join(","))}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col print:block">
      <div className="print:hidden">
        <PageHeader title={t("labels.title")} description={t("labels.description", { max: MAX_LABELS })}>
          <Link href={routes.warehouseScan} className={buttonVariants({ variant: "outline" })}>
            <ScanLineIcon />
            {t("scan.title")}
          </Link>
          <Button onClick={() => window.print()} disabled={!labels.data || labels.data.length === 0}>
            <PrinterIcon />
            {t("labels.print")}
          </Button>
        </PageHeader>

        <form onSubmit={submit} className="flex max-w-2xl flex-col gap-2 px-4 pb-5 sm:px-6">
          <Textarea
            rows={4}
            value={draft}
            spellCheck={false}
            placeholder={t("labels.placeholder")}
            aria-label={t("labels.placeholder")}
            onChange={(event) => setDraft(event.target.value)}
            className="bg-card font-mono"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline" disabled={parseCodes(draft).length === 0}>
              {t("labels.load")}
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              {t("labels.count", { count: parseCodes(draft).length, max: MAX_LABELS })}
            </span>
          </div>
          {missing.length > 0 ? (
            <p role="alert" className="text-sm text-destructive">
              {t("labels.missing", { codes: missing.join(", ") })}
            </p>
          ) : null}
        </form>
      </div>

      {codes.length === 0 ? (
        <p className="mx-4 max-w-2xl rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground sm:mx-6 print:hidden">
          {t("labels.empty")}
        </p>
      ) : labels.isError ? (
        <ErrorState title={t("labels.loadFailed")} error={labels.error} onRetry={() => labels.refetch()} className="print:hidden" />
      ) : labels.isPending ? (
        <div className="grid gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 print:hidden">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : (
        <ul className="grid gap-3 px-4 pb-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 print:block print:p-0">
          {labels.data.map((label) => (
            <LabelBlock key={`${label.type}-${label.code}`} label={label} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** One label. Black on white whatever the theme, because it is meant for paper. */
function LabelBlock({ label }: { label: WarehouseLabel }) {
  const t = useTranslations("warehouse");

  return (
    <li className="flex break-inside-avoid flex-col gap-2 rounded-lg border bg-white p-4 text-black print:mb-[4mm] print:rounded-none print:border-black">
      <p className="font-mono text-[0.625rem] tracking-widest uppercase">
        {label.type === "item" ? t("item.title") : t("location.title")}
      </p>
      <p className="text-lg leading-tight font-semibold break-words">{label.title}</p>
      {label.subtitle ? <p className="text-sm break-words">{label.subtitle}</p> : null}
      {/*
        OPEN POINT (BIK-3926): the barcode (`label.barcode`, Code 128) and the QR code
        (`label.qr`) are drawn here once a barcode library is approved as a dependency.
        Until then the label carries the code as text only.
      */}
      <p
        data-barcode-format={label.barcode.format}
        data-barcode-value={label.barcode.value}
        className="mt-1 border-t border-dashed border-black/40 pt-2 font-mono text-3xl font-semibold tracking-widest break-all"
      >
        {label.code}
      </p>
    </li>
  );
}
