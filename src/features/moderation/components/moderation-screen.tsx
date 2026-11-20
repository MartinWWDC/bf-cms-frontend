"use client";

import type { ReactNode } from "react";
import { ArrowRightIcon, ExternalLinkIcon, OctagonAlertIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecordScreenProps } from "@/features/resources/types";
import { useRecordScreen } from "@/features/resources/queries";
import { useFormat } from "@/i18n/use-format";
import type { RecordId, Tone } from "@/lib/api/types";

import type {
  AdReport,
  ModerationMessage,
  ModerationReview,
  ModerationSubject,
  PreviousCase,
  RiskLevel,
  SecurityEventEntry,
  UserHistory,
} from "../types";
import { Facts, FactText } from "./facts";

const RISK_TONE: Record<RiskLevel, Tone> = { none: "success", warning: "warning", high: "danger" };

const headingClass =
  "mb-1 flex items-center gap-3 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase after:h-px after:flex-1 after:bg-border";

const linkClass =
  "inline-flex items-center gap-1 rounded-sm text-xs underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The review screen of a moderation case (`cms/docs/moderation-workflow.md` section 4):
 * what waits, why it was flagged, who is behind it, and the decisions the admin may take.
 * A decision is a normal action of the case and runs in the shared action dialog; "Next
 * case" then moves on through the queue.
 *
 * Everything written by users (descriptions, reports, messages) is rendered as text.
 */
export function ModerationScreen({ contract, record, view, onOpenRecord, onRunAction, onShowRecord }: RecordScreenProps) {
  const t = useTranslations("moderation");
  const format = useFormat();
  const screen = useRecordScreen<ModerationReview>(contract.key, record.data.id, view);

  if (screen.isError) {
    return <ErrorState title={t("loadFailed")} error={screen.error} onRetry={() => screen.refetch()} />;
  }
  if (screen.isPending) {
    return (
      <div className="flex flex-col gap-4 px-5 py-6 sm:px-7" aria-busy>
        <Skeleton className="h-12" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const data = screen.data.data;
  const { case: moderationCase, flags, subject, user, history, next, queue } = data;
  // Decisions that apply to the case now; none once it is decided.
  const decisions = screen.data.meta.record.meta.actions
    .map((key) => contract.actions.find((action) => action.key === key))
    .filter((action) => action !== undefined && action.scope !== "standalone" && action.scope !== "many");
  const isRisky = (risk: RiskLevel) => (risk === "none" ? t("risk.none") : risk === "high" ? t("risk.high") : t("risk.warning"));

  return (
    <div className="flex flex-col gap-7 px-5 py-6 sm:px-7">
      <section aria-label={t("case.title")} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={isRisky(moderationCase.risk)} tone={RISK_TONE[moderationCase.risk] ?? "neutral"} />
          <span className="text-sm font-medium">{moderationCase.trigger_label}</span>
          {moderationCase.decision_label ? (
            <StatusBadge label={moderationCase.decision_label} tone="neutral" />
          ) : null}
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {t("queue.counts", { open: queue.open, mine: queue.mine, unassigned: queue.unassigned })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {moderationCase.opened_at ? t("case.openedAt", { date: format.dateTime(moderationCase.opened_at) }) : null}
          {moderationCase.waiting_hours !== null ? ` · ${t("case.waiting", { hours: moderationCase.waiting_hours })}` : null}
          {moderationCase.decided_at ? ` · ${t("case.decidedAt", { date: format.dateTime(moderationCase.decided_at) })}` : null}
          {moderationCase.reason_label ? ` · ${moderationCase.reason_label}` : null}
        </p>

        {flags.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {flags.map((flag) => (
              <li
                key={flag.code}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                  flag.level === "high" ? "border-destructive/40 bg-destructive/5" : "border-tone-warning/50 bg-tone-warning/10",
                )}
              >
                {flag.level === "high" ? (
                  <OctagonAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
                ) : (
                  <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-tone-warning" />
                )}
                {flag.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("case.noFlags")}</p>
        )}

        {decisions.length > 0 || next ? (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            {decisions.map((action) =>
              action ? (
                <Button
                  key={action.key}
                  variant={action.dangerous || action.tone === "danger" ? "destructive" : action.tone === "success" ? "default" : "outline"}
                  onClick={() => onRunAction(action.key)}
                >
                  {action.label}
                </Button>
              ) : null,
            )}
            {next ? (
              <Button variant="ghost" className="ml-auto" onClick={() => onShowRecord(next.id)}>
                <span className="max-w-56 truncate">{t("next", { title: next.title ?? `#${String(next.id)}` })}</span>
                <ArrowRightIcon />
              </Button>
            ) : (
              <span className="ml-auto text-xs text-muted-foreground">{t("queue.done")}</span>
            )}
          </div>
        ) : (
          <p className="border-t pt-3 text-xs text-muted-foreground">{t("queue.done")}</p>
        )}
      </section>

      {subject ? (
        <SubjectBlock title={t("subject.title")} subject={subject} onOpenRecord={onOpenRecord} />
      ) : (
        <p className="text-sm text-muted-foreground">{t("subject.gone")}</p>
      )}

      {data.reporter ? (
        <Block title={t("reporter.title")}>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {data.reporter.type === "system" ? t("reporter.system") : <FactText name="email" value={data.reporter.email} />}
            {data.reporter.user ? (
              <OpenLink
                label={data.reporter.user.title ?? `#${String(data.reporter.user.id)}`}
                onClick={() => data.reporter?.user && onOpenRecord(data.reporter.user.resource, data.reporter.user.id)}
              />
            ) : null}
          </p>
        </Block>
      ) : null}

      {data.reported_ad ? (
        <SubjectBlock title={t("reportedAd")} subject={data.reported_ad} onOpenRecord={onOpenRecord} />
      ) : null}

      {data.messages && data.messages.length > 0 ? (
        <Block title={t("messages.title")} count={data.messages.length}>
          <Messages messages={data.messages} senderId={user?.id} />
        </Block>
      ) : null}

      {data.reports && data.reports.length > 0 ? (
        <Block title={t("reports.title")} count={data.reports.length}>
          <Reports reports={data.reports} />
        </Block>
      ) : null}
      {data.other_reports && data.other_reports.length > 0 ? (
        <Block title={t("reports.other")} count={data.other_reports.length}>
          <Reports reports={data.other_reports} />
        </Block>
      ) : null}

      {user ? (
        <Block
          title={t("user.title")}
          action={<OpenLink label={user.name ?? `#${String(user.id)}`} onClick={() => onOpenRecord(user.resource, user.id)} />}
        >
          <Facts values={user} />
        </Block>
      ) : null}

      {history ? <History history={history} onOpenRecord={onOpenRecord} /> : null}

      {data.suspicious_messages && data.suspicious_messages.length > 0 ? (
        <Block title={t("messages.suspicious")} count={data.suspicious_messages.length}>
          <Messages messages={data.suspicious_messages} />
        </Block>
      ) : null}

      {data.security_events && data.security_events.length > 0 ? (
        <Block title={t("securityEvents.title")} count={data.security_events.length}>
          <SecurityEvents events={data.security_events} onOpenRecord={onOpenRecord} />
        </Block>
      ) : null}
    </div>
  );
}

function Block({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title}>
      <h3 className={headingClass}>
        {title}
        {count !== undefined ? <span className="text-foreground tabular-nums">{count}</span> : null}
      </h3>
      {action ? <div className="pt-1">{action}</div> : null}
      <div className="pt-1">{children}</div>
    </section>
  );
}

function OpenLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={linkClass}>
      <span className="max-w-64 truncate">{label}</span>
      <ExternalLinkIcon aria-hidden className="size-3 shrink-0" />
    </button>
  );
}

function imageUrl(image: string | Record<string, string>): string | null {
  if (typeof image === "string") return image;
  return Object.values(image).find((value) => typeof value === "string" && /^https?:\/\//.test(value)) ?? null;
}

/** The ad, user, business account, report or conversation, with its texts and pictures. */
function SubjectBlock({
  title,
  subject,
  onOpenRecord,
}: {
  title: string;
  subject: ModerationSubject;
  onOpenRecord: (resource: string, id: RecordId) => void;
}) {
  const t = useTranslations("moderation");
  const images = (subject.images ?? []).map(imageUrl).filter((url): url is string => url !== null);
  const texts = [subject.description, subject.text].filter((text): text is string => typeof text === "string" && text !== "");
  const resource = subject.resource;

  return (
    <Block
      title={title}
      action={
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-base font-medium break-words">{subject.title ?? `#${String(subject.id)}`}</span>
          {resource ? <OpenLink label={t("subject.open")} onClick={() => onOpenRecord(resource, subject.id)} /> : null}
        </p>
      }
    >
      {images.length > 0 ? (
        <ul className="scrollbar-slim mb-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((url, index) => (
            <li key={`${url}-${index}`} className="shrink-0">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-md border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Gallery URLs of the marketplace; hosts are not known to the image optimiser. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={t("subject.imageAlt", { number: index + 1 })}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="size-36 object-cover"
                />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {texts.map((text, index) => (
        <p key={index} className="mb-3 rounded-md border bg-muted/40 px-3 py-2 text-sm break-words whitespace-pre-wrap">
          {text}
        </p>
      ))}
      <Facts values={subject} />
    </Block>
  );
}

function Reports({ reports }: { reports: AdReport[] }) {
  const format = useFormat();
  return (
    <ul className="flex flex-col gap-2">
      {reports.map((report) => (
        <li key={String(report.id)} className="rounded-lg border bg-card px-3 py-2">
          <p className="flex flex-wrap items-center gap-x-3 font-mono text-xs text-muted-foreground">
            <FactText name="email" value={report.email} />
            {report.created_at ? <time dateTime={report.created_at}>{format.dateTime(report.created_at)}</time> : null}
          </p>
          {report.text ? <p className="mt-1 text-sm break-words whitespace-pre-wrap">{report.text}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function Messages({ messages, senderId }: { messages: ModerationMessage[]; senderId?: RecordId }) {
  const t = useTranslations("moderation");
  const format = useFormat();

  return (
    <ol className="flex flex-col gap-2">
      {messages.map((message) => {
        const fromUser = senderId !== undefined && message.user_id != null && String(message.user_id) === String(senderId);
        return (
          <li
            key={String(message.id)}
            className={cn(
              "max-w-[85%] rounded-lg border px-3 py-2",
              fromUser ? "self-end bg-accent/60" : "self-start bg-card",
              message.has_suspicious_content && "border-tone-warning/60",
            )}
          >
            <p className="flex flex-wrap items-center gap-x-2 font-mono text-[0.6875rem] text-muted-foreground">
              {message.user_id != null ? <span>{t("messages.from", { id: String(message.user_id) })}</span> : null}
              {message.created_at ? <time dateTime={message.created_at}>{format.dateTime(message.created_at)}</time> : null}
              {message.has_suspicious_content ? <span className="text-foreground">{t("messages.flagged")}</span> : null}
              {message.is_hidden ? <span>{t("messages.hidden")}</span> : null}
            </p>
            <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{message.text ?? "—"}</p>
          </li>
        );
      })}
    </ol>
  );
}

function SecurityEvents({
  events,
  onOpenRecord,
}: {
  events: SecurityEventEntry[];
  onOpenRecord: (resource: string, id: RecordId) => void;
}) {
  const format = useFormat();
  return (
    <ul className="flex flex-col divide-y text-sm">
      {events.map((event) => (
        <li key={event.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5">
          <button type="button" className={cn(linkClass, "text-sm")} onClick={() => onOpenRecord(event.resource, event.id)}>
            {event.event}
          </button>
          {event.country_code ? <span className="text-muted-foreground">{format.country(event.country_code)}</span> : null}
          <FactText name="ip" value={event.ip} />
          {event.created_at ? (
            <time dateTime={event.created_at} className="ml-auto font-mono text-xs text-muted-foreground">
              {format.dateTime(event.created_at)}
            </time>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** What is known about the user behind the case: their ads, purchases, reports and earlier cases. */
function History({
  history,
  onOpenRecord,
}: {
  history: UserHistory;
  onOpenRecord: (resource: string, id: RecordId) => void;
}) {
  const t = useTranslations("moderation");
  const format = useFormat();
  const stats: [string, number][] = [
    [t("history.adsTotal"), history.ads.total],
    [t("history.adsActive"), history.ads.active],
    [t("history.adsSold"), history.ads.sold],
    [t("history.adsDeleted"), history.ads.deleted],
    [t("history.checkoutsBought"), history.checkouts_bought],
    [t("history.reportsReceived"), history.reports_received],
    [t("history.negativeDecisions"), history.negative_decisions],
  ];

  return (
    <Block title={t("history.title")}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 rounded-lg border bg-card px-3 py-2">
            <dt className="font-mono text-[0.625rem] tracking-wider text-muted-foreground uppercase">{label}</dt>
            <dd className="font-heading text-xl leading-none font-semibold tabular-nums">{format.number(value)}</dd>
          </div>
        ))}
      </dl>
      {history.previous_cases.length > 0 ? (
        <>
          <h4 className="mt-4 mb-1 text-sm font-medium">{t("history.previousCases")}</h4>
          <ul className="flex flex-col divide-y text-sm">
            {history.previous_cases.map((previous: PreviousCase) => (
              <li key={`${previous.resource}-${String(previous.id)}`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5">
                <button
                  type="button"
                  className={cn(linkClass, "text-sm")}
                  onClick={() => onOpenRecord(previous.resource, previous.id)}
                >
                  <span className="max-w-64 truncate">{previous.title ?? `#${String(previous.id)}`}</span>
                </button>
                <span className="text-muted-foreground">{previous.decision_label ?? t("history.stillOpen")}</span>
                <time
                  dateTime={previous.decided_at ?? previous.opened_at ?? undefined}
                  className="ml-auto font-mono text-xs text-muted-foreground"
                >
                  {previous.decided_at ?? previous.opened_at
                    ? format.date((previous.decided_at ?? previous.opened_at) as string)
                    : null}
                </time>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Block>
  );
}
