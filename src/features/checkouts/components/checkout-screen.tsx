"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckIcon, CircleIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecordScreenProps } from "@/features/resources/types";
import { useRecordScreen } from "@/features/resources/queries";
import { useFormat } from "@/i18n/use-format";
import type { Money, Tone } from "@/lib/api/types";
import { routes } from "@/lib/routes";

import { hasPart, isZero, SETTLE_MONEY, SINGLE_MONEY_ACTIONS } from "../lib/overview";
import type {
  AddressKey,
  CheckoutMoney,
  CheckoutOverview,
  MoneyOperationReview,
  PartRecord,
  ProgressStep,
  RiskFlag,
  SettleMoneyInput,
} from "../types";
import { FieldRows, PartCard, sectionHeadingClass } from "./part-fields";

const ENDINGS: ReadonlySet<string> = new Set(["canceled", "refunded", "failed"]);

const PAYOUT_STATES = ["open", "approved", "processing", "paid_out", "failed", "closed"] as const;
const PAYOUT_STATE_TONE: Record<(typeof PAYOUT_STATES)[number], Tone> = {
  open: "neutral",
  approved: "info",
  processing: "warning",
  paid_out: "success",
  failed: "danger",
  closed: "neutral",
};

const OPERATIONS = ["refund", "approve_payout", "pay_out"] as const;
const ADDRESS_KEYS: AddressKey[] = ["shipping", "billing", "seller_shipping", "seller_billing", "seller_packaging"];
const COUNT_KEYS = ["notes", "open_tasks", "events", "notification_logs"] as const;

function isKnown<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

/**
 * The checkout overview: the whole checkout in one call
 * (`GET /resources/checkouts/records/{id}/screen`, `cms/docs/checkout-workflow.md`).
 *
 * Parts the admin may not view are named in `hidden_parts` and simply not shown. Money
 * moves only through the record's actions, which open the shared action dialog (preview,
 * risk flags, reason, confirmation, idempotency key).
 */
export function CheckoutScreen({ contract, record, onOpenRecord, onRunAction }: RecordScreenProps) {
  const t = useTranslations("checkouts");
  const screen = useRecordScreen<CheckoutOverview>(contract.key, record.data.id);

  if (screen.isError) {
    return <ErrorState title={t("loadFailed")} error={screen.error} onRetry={() => screen.refetch()} />;
  }
  if (screen.isPending) {
    return (
      <div className="flex flex-col gap-4 px-5 py-6 sm:px-7" aria-busy>
        <Skeleton className="h-14" />
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const data = screen.data.data;
  // The record that came with the screen is the freshest: its actions match the money shown.
  const actions = screen.data.meta.record.meta.actions;
  const list = (records: PartRecord[] | undefined, title: string) =>
    records && records.length > 0 ? (
      <Section title={title} count={records.length}>
        <div className="grid gap-3 lg:grid-cols-2">
          {records.map((entry, index) => (
            <PartCard key={String(entry.id ?? index)} record={entry} onOpenRecord={onOpenRecord} />
          ))}
        </div>
      </Section>
    ) : null;

  return (
    <div className="flex flex-col gap-7 px-5 py-6 sm:px-7">
      <Progress steps={data.progress} />

      <MoneyPanel money={data.money} actions={actions} contractActions={contract.actions} onRunAction={onRunAction} />

      {data.payout_blocks.length > 0 ? (
        <Section title={t("payoutBlocks.title")} count={data.payout_blocks.length}>
          <PayoutBlocks blocks={data.payout_blocks} />
        </Section>
      ) : null}

      <Section title={t("sections.checkout")}>
        <FieldRows contract={contract} values={data.checkout} onOpenRecord={onOpenRecord} />
      </Section>

      <Section title={t("sections.pricing")}>
        <FieldRows contract={contract} values={data.pricing} onOpenRecord={onOpenRecord} />
      </Section>

      {hasPart(data, "buyer") || hasPart(data, "seller") ? (
        <Section title={t("sections.people")}>
          <div className="grid gap-3 lg:grid-cols-2">
            {hasPart(data, "buyer") ? (
              <Person title={t("buyer")} person={data.buyer} contract={contract} onOpenRecord={onOpenRecord} />
            ) : null}
            {hasPart(data, "seller") ? (
              <Person title={t("seller")} person={data.seller} contract={contract} onOpenRecord={onOpenRecord} />
            ) : null}
          </div>
        </Section>
      ) : null}

      {(hasPart(data, "ad") && data.ad) || (hasPart(data, "offer") && data.offer) ? (
        <Section title={t("sections.listing")}>
          <div className="grid gap-3 lg:grid-cols-2">
            {hasPart(data, "ad") && data.ad ? (
              <PartCard title={t("ad")} record={data.ad} onOpenRecord={onOpenRecord} />
            ) : null}
            {hasPart(data, "offer") && data.offer ? (
              <PartCard title={t("offer")} record={data.offer} onOpenRecord={onOpenRecord} />
            ) : null}
          </div>
        </Section>
      ) : null}

      {hasPart(data, "addresses") && ADDRESS_KEYS.some((key) => data.addresses[key]) ? (
        <Section title={t("sections.addresses")}>
          <div className="grid gap-3 lg:grid-cols-2">
            {ADDRESS_KEYS.map((key) => {
              const address = data.addresses[key];
              return address ? (
                <PartCard key={key} title={t(`addresses.${key}`)} record={address} onOpenRecord={onOpenRecord} />
              ) : null;
            })}
          </div>
        </Section>
      ) : null}

      {hasPart(data, "shipments") ? list(data.shipments, t("sections.shipments")) : null}
      {hasPart(data, "complaints") ? list(data.complaints, t("sections.complaints")) : null}
      {hasPart(data, "cancellation") && data.cancellation
        ? list([data.cancellation], t("sections.cancellation"))
        : null}
      {hasPart(data, "insurance") && data.insurance ? list([data.insurance], t("sections.insurance")) : null}
      {hasPart(data, "invoices") ? list(data.invoices, t("sections.invoices")) : null}

      <Section title={t("packagingProof.title")}>
        <PackagingProof proof={data.packaging_proof} />
      </Section>

      <Section title={t("sections.activity")}>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COUNT_KEYS.map((key) => {
            const entry = data.counts[key];
            // Both are null when the admin may not see that feed.
            if (!entry || entry.count === null) return null;
            const body = (
              <>
                <dt className="font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">
                  {t(`counts.${key}`)}
                </dt>
                <dd className="font-heading text-2xl leading-none font-semibold tabular-nums">{entry.count}</dd>
              </>
            );
            const className = "flex flex-col gap-1.5 rounded-lg border bg-card px-3 py-2.5";
            return key === "open_tasks" ? (
              <Link
                key={key}
                href={`${routes.tasks}?resource=${contract.key}&record_id=${encodeURIComponent(String(record.data.id))}`}
                className={cn(className, "outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring")}
              >
                {body}
              </Link>
            ) : (
              <div key={key} className={className}>
                {body}
              </div>
            );
          })}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">{t("counts.hint")}</p>
      </Section>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className={sectionHeadingClass}>
        {title}
        {count !== undefined ? <span className="text-foreground tabular-nums">{count}</span> : null}
      </h3>
      <div className="pt-2">{children}</div>
    </section>
  );
}

/** The steps a checkout goes through, with when each one happened. */
function Progress({ steps }: { steps: ProgressStep[] }) {
  const t = useTranslations("checkouts");
  const format = useFormat();

  return (
    <ol aria-label={t("sections.progress")} className="scrollbar-slim flex gap-2 overflow-x-auto pb-1">
      {steps.map((step) => {
        const ending = ENDINGS.has(step.step);
        return (
          <li
            key={step.step}
            className={cn(
              "flex min-w-32 flex-1 flex-col gap-1 rounded-lg border px-3 py-2",
              step.done ? "bg-card" : "border-dashed text-muted-foreground",
              step.done && ending && "border-tone-danger/50 bg-tone-danger/10",
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {step.done ? (
                ending ? (
                  <OctagonXIcon aria-hidden className="size-3.5 text-tone-danger" />
                ) : (
                  <CheckIcon aria-hidden className="size-3.5 text-tone-success" />
                )
              ) : (
                <CircleIcon aria-hidden className="size-3 opacity-50" />
              )}
              {step.label}
              <span className="sr-only">{step.done ? t("progress.done") : t("progress.pending")}</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {step.at ? format.dateTime(step.at) : step.done ? t("progress.noTime") : "—"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Amount({ label, money, strong, hint }: { label: string; money: Money; strong?: boolean; hint?: string }) {
  const format = useFormat();
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 py-3 first:pl-0 sm:px-5">
      <dt className="font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className={cn("font-mono tabular-nums", strong ? "text-lg font-semibold" : "text-base")}>
        {format.money(money)}
      </dd>
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

const FLAG_STYLE: Record<RiskFlag["level"], string> = {
  info: "text-muted-foreground",
  warning: "text-foreground",
  blocking: "text-destructive",
};

function FlagList({ flags }: { flags: RiskFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {flags.map((flag) => (
        <li key={flag.code} className={cn("flex items-start gap-1.5 text-xs", FLAG_STYLE[flag.level])}>
          {flag.level === "blocking" ? (
            <OctagonXIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          ) : flag.level === "warning" ? (
            <TriangleAlertIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-tone-warning" />
          ) : (
            <InfoIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          )}
          <span>{flag.message}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Where the money is, and the one flow that moves it. Starting a step here opens the
 * `settle_money` action in the shared dialog, which previews the plan and its risk flags
 * before anything happens.
 */
function MoneyPanel({
  money,
  actions,
  contractActions,
  onRunAction,
}: {
  money: CheckoutMoney;
  actions: string[];
  contractActions: RecordScreenProps["contract"]["actions"];
  onRunAction: RecordScreenProps["onRunAction"];
}) {
  const t = useTranslations("checkouts");
  const format = useFormat();
  const { summary, operations, runs } = money;
  const canSettle = actions.includes(SETTLE_MONEY);
  const settle = (input: SettleMoneyInput) => onRunAction(SETTLE_MONEY, input as Record<string, unknown>);
  const review = (operation: string): MoneyOperationReview | undefined => operations?.[operation];
  const singles = SINGLE_MONEY_ACTIONS.filter((key) => actions.includes(key));
  const labelOf = (key: string) => contractActions.find((action) => action.key === key)?.label ?? key;
  const state = summary.payout_state;

  return (
    <section aria-label={t("money.title")} className="overflow-hidden rounded-lg border">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/50 px-4 py-2">
        <h3 className="text-sm font-medium">{t("money.title")}</h3>
        <StatusBadge
          label={isKnown(PAYOUT_STATES, state) ? t(`money.payoutState.${state}`) : state}
          tone={isKnown(PAYOUT_STATES, state) ? PAYOUT_STATE_TONE[state] : "neutral"}
        />
        {summary.seller_fee_waived ? <StatusBadge label={t("money.sellerFeeWaived")} tone="info" /> : null}
        {summary.transfer_id ? (
          <span className="ml-auto font-mono text-xs text-muted-foreground select-all">{summary.transfer_id}</span>
        ) : null}
      </header>

      <dl className="grid grid-cols-2 divide-x border-b px-4 sm:grid-cols-4">
        <Amount label={t("money.collected")} money={summary.collected} strong />
        <Amount
          label={t("money.refunded")}
          money={summary.refunded}
          hint={isZero(summary.refund_pending) ? undefined : t("money.refundPending", { amount: format.money(summary.refund_pending) })}
        />
        <Amount
          label={t("money.paidOut")}
          money={summary.paid_out}
          hint={isZero(summary.payable) ? undefined : t("money.payable", { amount: format.money(summary.payable) })}
        />
        <Amount label={t("money.platformKeeps")} money={summary.platform_keeps} strong />
      </dl>
      <dl className="grid grid-cols-2 divide-x border-b px-4 sm:grid-cols-4">
        <Amount label={t("money.refundable")} money={summary.refundable} />
        <Amount label={t("money.payoutPlanned")} money={summary.payout_planned} />
        <Amount label={t("money.payoutOriginal")} money={summary.payout_original} />
        <Amount label={t("money.estimatedCosts")} money={summary.estimated_costs} />
      </dl>
      <dl className="grid grid-cols-2 gap-x-6 border-b px-4 py-2 text-sm sm:grid-cols-4">
        {(["price", "buyer_fee", "shipping", "box", "buyer_protection", "discount", "seller_fee"] as const).map((key) =>
          isZero(summary[key]) && key !== "price" ? null : (
            <div key={key} className="flex items-baseline justify-between gap-3 py-1">
              <dt className="text-muted-foreground">{t(`money.parts.${key}`)}</dt>
              <dd className="font-mono tabular-nums">{format.money(summary[key])}</dd>
            </div>
          ),
        )}
      </dl>

      {operations ? (
        <ul className="grid divide-y border-b sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {OPERATIONS.map((operation) => {
            const entry = review(operation);
            if (!entry) return null;
            return (
              <li key={operation} className="flex flex-col gap-2 px-4 py-3">
                <span className="flex items-center justify-between gap-2 text-sm font-medium">
                  {t(`money.operations.${operation}`)}
                  <StatusBadge
                    label={entry.allowed ? t("money.allowed") : t("money.blocked")}
                    tone={entry.allowed ? "success" : "danger"}
                  />
                </span>
                <FlagList flags={entry.flags} />
              </li>
            );
          })}
        </ul>
      ) : null}

      {canSettle || singles.length > 0 ? (
        <div className="flex flex-col gap-3 bg-muted/30 px-4 py-3">
          {canSettle ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => settle({})}>{t("money.settle")}</Button>
              {review("refund")?.allowed && !isZero(summary.refundable) ? (
                <Button
                  variant="outline"
                  className="bg-card"
                  onClick={() => settle({ refund_amount: summary.refundable.amount, payout: "none" })}
                >
                  {t("money.refundAll", { amount: format.money(summary.refundable) })}
                </Button>
              ) : null}
              {review("approve_payout")?.allowed ? (
                <Button variant="outline" className="bg-card" onClick={() => settle({ payout: "approve" })}>
                  {t("money.approvePayout")}
                </Button>
              ) : null}
              {review("pay_out")?.allowed ? (
                <Button variant="outline" className="bg-card" onClick={() => settle({ payout: "now" })}>
                  {t("money.payOutNow")}
                </Button>
              ) : null}
              <p className="basis-full text-xs text-muted-foreground">{t("money.settleHint")}</p>
            </div>
          ) : null}
          {singles.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("money.singleActions")}</span>
              {singles.map((key) => (
                <Button key={key} variant="ghost" size="sm" onClick={() => onRunAction(key)}>
                  {labelOf(key)}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {runs && runs.length > 0 ? (
        <div className="border-t px-4 py-3">
          <h4 className="mb-2 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">
            {t("money.runs")}
          </h4>
          <ul className="flex flex-col divide-y text-sm">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5">
                <span className="font-medium">
                  {isKnown(OPERATIONS, run.operation) ? t(`money.operations.${run.operation}`) : run.operation.replaceAll("_", " ")}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{run.status}</span>
                {run.amount ? <span className="font-mono tabular-nums">{format.money(run.amount)}</span> : null}
                {run.created_at ? (
                  <time dateTime={run.created_at} className="ml-auto font-mono text-xs text-muted-foreground">
                    {format.dateTime(run.created_at)}
                  </time>
                ) : null}
                {run.reason ? <span className="basis-full text-muted-foreground">{run.reason}</span> : null}
                {run.error ? <span className="basis-full text-destructive">{run.error}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function PayoutBlocks({ blocks }: { blocks: CheckoutOverview["payout_blocks"] }) {
  const t = useTranslations("checkouts");
  const format = useFormat();

  return (
    <ul className="flex flex-col gap-2">
      {blocks.map((block) => (
        <li
          key={block.id}
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm",
            block.open ? "border-tone-warning/50 bg-tone-warning/10" : "bg-card",
          )}
        >
          <span className="font-medium">{block.reason_label}</span>
          <StatusBadge
            label={block.open ? t("payoutBlocks.open") : t("payoutBlocks.resolved")}
            tone={block.open ? "warning" : "success"}
          />
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {block.created_at ? format.dateTime(block.created_at) : null}
          </span>
          {block.resolved_at ? (
            <span className="basis-full text-xs text-muted-foreground">
              {block.resolved_by
                ? t("payoutBlocks.resolvedBy", { name: block.resolved_by.name, date: format.dateTime(block.resolved_at) })
                : t("payoutBlocks.resolvedAt", { date: format.dateTime(block.resolved_at) })}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** The contact stored on the checkout, next to the user account it belongs to. */
function Person({
  title,
  person,
  contract,
  onOpenRecord,
}: {
  title: string;
  person: NonNullable<CheckoutOverview["buyer"]>;
  contract: RecordScreenProps["contract"];
  onOpenRecord: RecordScreenProps["onOpenRecord"];
}) {
  const t = useTranslations("checkouts");

  return (
    <div className="flex flex-col gap-2">
      <article className="rounded-lg border bg-card px-4 pt-3 pb-1">
        <h4 className="text-sm font-medium">{t("contactOf", { person: title })}</h4>
        <FieldRows contract={contract} values={person.contact} onOpenRecord={onOpenRecord} className="sm:grid-cols-1" />
      </article>
      {person.user ? (
        <PartCard title={t("accountOf", { person: title })} record={person.user} onOpenRecord={onOpenRecord} />
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">{t("noAccount")}</p>
      )}
    </div>
  );
}

function PackagingProof({ proof }: { proof: CheckoutOverview["packaging_proof"] }) {
  const t = useTranslations("checkouts");
  const format = useFormat();

  if (!proof.provided || proof.images.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("packagingProof.none")}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-3">
      {proof.images.map((image) => (
        <li key={String(image.id)}>
          <a
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-32 flex-col gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {image.mime?.startsWith("image/") ?? true ? (
              // Storage links can be signed and short-lived, so the image optimiser cannot be used.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.url}
                alt={t("packagingProof.imageAlt", { name: image.name })}
                loading="lazy"
                className="size-32 rounded-md border bg-muted object-cover"
              />
            ) : (
              <span className="flex size-32 items-center justify-center rounded-md border bg-muted p-2 text-center text-xs break-all">
                {image.name}
              </span>
            )}
            <span className="font-mono text-[0.6875rem] text-muted-foreground">
              {image.created_at ? format.dateTime(image.created_at) : format.fileSize(image.size)}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
