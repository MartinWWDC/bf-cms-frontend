"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CircleAlertIcon, CircleCheckIcon, CircleSlashIcon, LoaderIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { useFormat } from "@/i18n/use-format";

import type { LiveStep } from "../hooks/use-chat";
import { resolveLink } from "../lib/cms-links";
import { renderMarkdown } from "../lib/markdown";
import type { AssistantLink, AssistantMessage, AssistantProposal, AssistantStep } from "../types";
import { ProposalCard } from "./proposal-card";

const chipClass =
  "inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-xs outline-none";

function Markdown({ content }: { content: string }) {
  const blocks = useMemo(() => renderMarkdown(content), [content]);
  return <div className="flex flex-col gap-2 text-sm leading-relaxed break-words">{blocks}</div>;
}

export function UserBubble({ content }: { content: string }) {
  return (
    <li className="flex justify-end">
      <p className="max-w-[min(85%,40rem)] rounded-2xl rounded-br-sm bg-secondary px-3.5 py-2 text-sm break-words whitespace-pre-wrap text-secondary-foreground">
        {content}
      </p>
    </li>
  );
}

function StepStatusIcon({ step }: { step: AssistantStep | null }) {
  if (!step) return <LoaderIcon aria-hidden className="size-3.5 shrink-0 animate-spin text-muted-foreground" />;
  if (step.status === "ok") return <CircleCheckIcon aria-hidden className="size-3.5 shrink-0 text-tone-success" />;
  if (step.status === "denied") return <CircleSlashIcon aria-hidden className="size-3.5 shrink-0 text-tone-warning" />;
  return <CircleAlertIcon aria-hidden className="size-3.5 shrink-0 text-tone-danger" />;
}

/** The tools the assistant used, so the admin can check what it looked at. */
function Steps({ steps, open = false }: { steps: LiveStep[]; open?: boolean }) {
  const t = useTranslations("assistant.chat");
  const format = useFormat();
  if (steps.length === 0) return null;

  return (
    <details open={open} className="rounded-md border bg-muted/40 text-xs">
      <summary className="cursor-pointer px-2.5 py-1.5 text-muted-foreground outline-none select-none focus-visible:ring-2 focus-visible:ring-ring">
        {t("steps", { count: steps.length })}
      </summary>
      <ul className="flex flex-col gap-1 border-t px-2.5 py-2">
        {steps.map((entry) => (
          <li key={entry.id} className="flex items-start gap-2">
            <span className="mt-0.5">
              <StepStatusIcon step={entry.step} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="break-words">{entry.label}</span>
              {entry.step ? (
                <span className="sr-only">
                  {" "}
                  {t(`stepStatus.${entry.step.status}`)}
                </span>
              ) : null}
              {entry.step?.error ? <span className="block text-destructive">{entry.step.error}</span> : null}
              {entry.step?.status === "denied" && !entry.step.error ? (
                <span className="block text-muted-foreground">{t("stepStatus.denied")}</span>
              ) : null}
            </span>
            {entry.step ? (
              <span className="shrink-0 font-mono text-muted-foreground tabular-nums">
                {t("duration", { seconds: format.number(entry.step.duration_ms / 1000, 1) })}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** The records, lists and dashboards an answer is based on. */
function Links({ links }: { links: AssistantLink[] }) {
  const t = useTranslations("assistant.chat");
  const format = useFormat();
  // The same page is often named by several steps.
  const unique = links.filter((link, index) => links.findIndex((other) => other.href === link.href) === index);
  if (unique.length === 0) return null;

  return (
    <ul aria-label={t("links")} className="flex flex-wrap gap-1.5">
      {unique.map((link) => {
        const target = resolveLink(link.href);
        const content = (
          <>
            <span className="truncate">{link.label ?? link.id ?? link.resource ?? t(`linkTypes.${link.type}`)}</span>
            {typeof link.total === "number" ? (
              <span className="font-mono text-muted-foreground tabular-nums">{format.number(link.total)}</span>
            ) : null}
          </>
        );
        return (
          <li key={link.href} className="max-w-full">
            {target.kind === "internal" ? (
              <Link href={target.href} className={cn(chipClass, "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring")}>
                {content}
              </Link>
            ) : (
              <span className={cn(chipClass, "text-muted-foreground")}>{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Proposals({ proposals }: { proposals: AssistantProposal[] }) {
  if (proposals.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} />
      ))}
    </div>
  );
}

/** One stored message: the admin's question, or the assistant's answer with what it is based on. */
export function MessageItem({ message, canPropose }: { message: AssistantMessage; canPropose: boolean }) {
  const t = useTranslations("assistant.chat");

  if (message.role === "user") return <UserBubble content={message.content} />;

  const steps: LiveStep[] = message.steps.map((step) => ({ id: step.id, label: step.label, step }));

  return (
    <li className="flex flex-col gap-2.5">
      <Steps steps={steps} />
      {message.status === "failed" ? (
        // The provider failed: `content` is the error text.
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message.content || t("failed")}
        </p>
      ) : (
        <Markdown content={message.content} />
      )}
      {message.status === "stopped" ? (
        <p className="rounded-md bg-tone-warning/10 px-3 py-1.5 text-xs text-muted-foreground">{t("stopped")}</p>
      ) : null}
      <Links links={message.links} />
      {canPropose ? <Proposals proposals={message.proposals} /> : null}
    </li>
  );
}

interface LiveAnswerProps {
  text: string;
  steps: LiveStep[];
  links: AssistantLink[];
}

/** The answer while it is being written. It is replaced by the stored message at the end. */
export function LiveAnswer({ text, steps, links }: LiveAnswerProps) {
  const t = useTranslations("assistant.chat");

  return (
    <li className="flex flex-col gap-2.5" aria-live="polite" aria-busy>
      <Steps steps={steps} open />
      {text ? (
        <Markdown content={text} />
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderIcon aria-hidden className="size-3.5 animate-spin" />
          {t("thinking")}
        </p>
      )}
      <Links links={links} />
    </li>
  );
}
