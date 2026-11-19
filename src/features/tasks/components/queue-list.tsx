"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, EyeIcon, EyeOffIcon, PinIcon, PinOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";
import { useFormat } from "@/i18n/use-format";
import { useErrorToast } from "@/lib/api/use-error-message";
import type { Tone } from "@/lib/api/types";
import { resourceHref } from "@/lib/routes";

import { useQueuePreference } from "../mutations";
import type { TaskQueue } from "../types";

const TONE_BAR: Record<Tone, string> = {
  neutral: "bg-tone-neutral",
  info: "bg-tone-info",
  success: "bg-tone-success",
  warning: "bg-tone-warning",
  danger: "bg-tone-danger",
};

const iconButton =
  "flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 [&_svg]:size-3.5";

/**
 * Queues: saved filters on a resource with a live count. Pinned ones come first (the
 * backend orders them); hidden ones stay reachable in a collapsed part.
 */
export function QueueList({ queues }: { queues: TaskQueue[] }) {
  const t = useTranslations("tasks.queues");
  const [showHidden, setShowHidden] = useState(false);
  const visible = queues.filter((queue) => !queue.hidden);
  const hidden = queues.filter((queue) => queue.hidden);

  if (queues.length === 0) return <p className="text-sm text-muted-foreground">{t("empty")}</p>;

  return (
    <div className="flex flex-col gap-3">
      {visible.length === 0 ? <p className="text-sm text-muted-foreground">{t("allHidden")}</p> : null}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visible.map((queue) => (
          <QueueCard key={queue.key} queue={queue} />
        ))}
      </ul>
      {hidden.length > 0 ? (
        <>
          <button
            type="button"
            aria-expanded={showHidden}
            onClick={() => setShowHidden(!showHidden)}
            className="flex items-center gap-1 self-start text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRightIcon className={cn("size-4 transition-transform", showHidden && "rotate-90")} />
            {t("hidden", { count: hidden.length })}
          </button>
          {showHidden ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {hidden.map((queue) => (
                <QueueCard key={queue.key} queue={queue} />
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function QueueCard({ queue }: { queue: TaskQueue }) {
  const t = useTranslations("tasks.queues");
  const format = useFormat();
  const toastError = useErrorToast();
  const preference = useQueuePreference();
  const { all, all_capped: capped, mine } = queue.count;

  return (
    <li
      className={cn(
        "relative flex flex-col gap-2 overflow-hidden rounded-lg border bg-card p-3 pl-4",
        queue.hidden && "opacity-70",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", TONE_BAR[queue.tone] ?? TONE_BAR.neutral)} />
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium break-words">{queue.label}</h3>
          <p className="font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">
            {queue.resource_label}
          </p>
        </div>
        <button
          type="button"
          className={iconButton}
          disabled={preference.isPending}
          aria-label={queue.pinned ? t("unpin") : t("pin")}
          title={queue.pinned ? t("unpin") : t("pin")}
          onClick={() => preference.mutate({ queue: queue.key, pinned: !queue.pinned }, { onError: toastError })}
        >
          {queue.pinned ? <PinOffIcon className="text-brand" /> : <PinIcon />}
        </button>
        <button
          type="button"
          className={iconButton}
          disabled={preference.isPending}
          aria-label={queue.hidden ? t("show") : t("hide")}
          title={queue.hidden ? t("show") : t("hide")}
          onClick={() => preference.mutate({ queue: queue.key, hidden: !queue.hidden }, { onError: toastError })}
        >
          {queue.hidden ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>
      {queue.description ? <p className="text-xs text-muted-foreground">{queue.description}</p> : null}
      <div className="mt-auto flex flex-wrap items-end gap-2 pt-1">
        <p className="mr-auto font-heading text-2xl leading-none font-semibold tracking-tight tabular-nums">
          {all === null ? "–" : capped ? t("capped", { count: format.number(all) }) : format.number(all)}
        </p>
        {queue.mine_filter != null ? (
          <Link
            href={resourceHref(queue.resource, null, { filter: queue.mine_filter })}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("mine", { count: mine === null ? "–" : format.number(mine) })}
          </Link>
        ) : null}
        <Link
          href={resourceHref(queue.resource, null, { filter: queue.filter })}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("open")}
        </Link>
      </div>
    </li>
  );
}
