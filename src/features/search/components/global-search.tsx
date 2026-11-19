"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, ClockIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useFormat } from "@/i18n/use-format";
import { useErrorMessage } from "@/lib/api/use-error-message";
import { recordHref, resourceHref } from "@/lib/routes";

import { useGlobalSearch } from "../queries";
import { MAX_QUERY_LENGTH } from "../types";

const DEBOUNCE_MS = 250;

/** One row the arrow keys can land on: a result, a recent record, or a group's "show all". */
interface Option {
  key: string;
  href: string;
}

/**
 * One search box for everything staff have in hand: an id, an email, a name, a tracking
 * number, a payment reference, a phone number. Opened from the header or with Cmd/Ctrl+K.
 * With an empty box it lists the records the admin opened last.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={className}
        aria-label={t("open")}
        title={t("openHint")}
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-[12svh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
          {/* Mounted per opening, so the box always starts empty. */}
          {open ? <SearchPanel onClose={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslations("search");
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const listId = useId();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const search = useGlobalSearch(query, true);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const type = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setQuery(next.trim()), DEBOUNCE_MS);
  };

  const data = search.data;
  // The answer on screen can still be the previous query's while the next one loads.
  const isSearching = query !== "";
  const groups = useMemo(() => (isSearching ? (data?.groups ?? []) : []), [isSearching, data]);
  const recent = useMemo(() => (isSearching ? [] : (data?.recent ?? [])), [isSearching, data]);

  const options = useMemo<Option[]>(() => {
    const list: Option[] = recent.map((record) => ({
      key: `recent:${record.resource}:${record.id}`,
      href: recordHref(record.resource, record.id),
    }));
    for (const group of groups) {
      for (const result of group.results) {
        list.push({ key: `${result.resource}:${result.id}`, href: recordHref(result.resource, result.id) });
      }
      if (group.has_more) {
        list.push({ key: `more:${group.resource}`, href: resourceHref(group.resource, null, { q: query }) });
      }
    }
    return list;
  }, [recent, groups, query]);

  const active = options.find((option) => option.key === activeKey) ?? options[0];
  const optionId = (key: string) => `${listId}-${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const move = (by: number) => {
    if (options.length === 0) return;
    const index = active ? options.indexOf(active) : -1;
    const next = options[(index + by + options.length) % options.length];
    setActiveKey(next.key);
    document.getElementById(optionId(next.key))?.scrollIntoView({ block: "nearest" });
  };

  const optionClass = (key: string) =>
    cn(
      "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm outline-none",
      active?.key === key ? "bg-accent" : "hover:bg-accent/60",
    );
  const optionProps = (option: Option) => ({
    id: optionId(option.key),
    role: "option" as const,
    "aria-selected": active?.key === option.key,
    // The input keeps the focus; the list is driven through `aria-activedescendant`.
    tabIndex: -1,
    onMouseMove: () => setActiveKey(option.key),
    onClick: () => go(option.href),
    className: optionClass(option.key),
  });

  const nothingFound =
    isSearching && !search.isFetching && data?.query === query && groups.every((group) => group.results.length === 0);

  return (
    <>
      <DialogTitle className="sr-only">{t("title")}</DialogTitle>
      <DialogDescription className="sr-only">{t("description")}</DialogDescription>
      <div className="flex items-center gap-2.5 border-b px-4">
        <SearchIcon aria-hidden className={cn("size-4 shrink-0 text-muted-foreground", search.isFetching && "animate-pulse")} />
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? optionId(active.key) : undefined}
          aria-label={t("placeholder")}
          placeholder={t("placeholder")}
          value={draft}
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => type(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              move(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              move(-1);
            } else if (event.key === "Enter" && active) {
              event.preventDefault();
              go(active.href);
            }
          }}
          className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded-sm border px-1.5 font-mono text-[0.625rem] text-muted-foreground sm:block">Esc</kbd>
      </div>

      {isSearching && data && data.query === query && data.identifiers.length > 0 ? (
        <ul aria-label={t("recognisedAs")} className="flex flex-wrap gap-1.5 border-b px-4 py-2">
          {data.identifiers.map((identifier) => (
            <li key={`${identifier.kind}:${identifier.value}`} className="rounded-full border bg-card px-2 py-0.5 text-xs">
              <span className="text-muted-foreground">{identifier.label}:</span>{" "}
              <span className="font-mono">{identifier.value}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div id={listId} role="listbox" aria-label={t("results")} className="scrollbar-slim max-h-[min(28rem,60svh)] overflow-y-auto py-1">
        {search.isError ? (
          <p role="alert" className="px-4 py-6 text-center text-sm text-destructive">
            {errorMessage(search.error)}
          </p>
        ) : null}

        {!isSearching && !search.isError ? (
          <>
            <p className="px-4 pt-2 pb-1 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">
              {t("recent")}
            </p>
            {search.isPending ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">{t("loading")}</p>
            ) : recent.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">{t("recentEmpty")}</p>
            ) : (
              recent.map((record) => {
                const option = options.find((entry) => entry.key === `recent:${record.resource}:${record.id}`);
                if (!option) return null;
                return (
                  <button key={option.key} type="button" {...optionProps(option)}>
                    <ClockIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{record.title}</span>
                      {record.subtitle ? (
                        <span className="block truncate text-xs text-muted-foreground">{record.subtitle}</span>
                      ) : null}
                    </span>
                    {record.viewed_at ? (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{format.relative(record.viewed_at)}</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </>
        ) : null}

        {groups.map((group) => (
          <div key={group.resource} role="group" aria-label={group.label}>
            <p className="flex items-center gap-2 px-4 pt-2 pb-1 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">
              {group.label}
              {group.unavailable ? (
                <span className="rounded-sm bg-tone-warning/20 px-1.5 py-0.5 text-foreground normal-case">
                  {t("unavailable")}
                </span>
              ) : null}
            </p>
            {group.results.length === 0 && !group.unavailable ? (
              <p className="px-4 pb-2 text-sm text-muted-foreground">{t("groupEmpty")}</p>
            ) : null}
            {group.results.map((result) => {
              const option = options.find((entry) => entry.key === `${result.resource}:${result.id}`);
              if (!option) return null;
              return (
                <button key={option.key} type="button" {...optionProps(option)}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{result.title}</span>
                    {result.subtitle ? (
                      <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
                    ) : null}
                  </span>
                  {result.exact ? (
                    <span className="shrink-0 rounded-sm bg-brand px-1.5 py-0.5 font-mono text-[0.625rem] text-brand-foreground uppercase">
                      {t("exact")}
                    </span>
                  ) : null}
                </button>
              );
            })}
            {group.has_more
              ? (() => {
                  const option = options.find((entry) => entry.key === `more:${group.resource}`);
                  if (!option) return null;
                  return (
                    <button type="button" {...optionProps(option)}>
                      <ArrowRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("showAll", { resource: group.label })}</span>
                    </button>
                  );
                })()
              : null}
          </div>
        ))}

        {isSearching && search.isPending ? <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("loading")}</p> : null}
        {nothingFound ? <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("empty", { query })}</p> : null}
      </div>

      <p className="hidden border-t bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground sm:block">{t("hint")}</p>
    </>
  );
}
