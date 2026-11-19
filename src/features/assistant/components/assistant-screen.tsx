"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessagesSquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { ErrorState } from "@/components/error-state";
import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/session/hooks/use-permissions";
import { useFormat } from "@/i18n/use-format";

import { contextFromParams, hasContextParams } from "../lib/page-context";
import { useAssistantStatus } from "../queries";
import { ChatPanel } from "./chat-panel";
import { ConversationList } from "./conversation-list";
import { UsageReport } from "./usage-report";

function setUrlParams(change: (params: URLSearchParams) => void, push = false) {
  const params = new URLSearchParams(window.location.search);
  change(params);
  const query = params.toString();
  const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  if (push) window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

/**
 * The assistant page: the admin's conversations on the left, the chat on the right, and
 * the usage report for admins who may see it. Everything needs `assistant.use`.
 *
 * Must be rendered inside `<Suspense>`: the open conversation (`?c=`) and the page the
 * admin came from (`?resource=&record=...`) live in the URL.
 */
export function AssistantScreen() {
  const t = useTranslations("assistant");
  const format = useFormat();
  const { can, me } = usePermissions();
  const allowed = can("assistant.use");
  const status = useAssistantStatus(allowed);
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"chat" | "usage">("chat");
  const [listOpen, setListOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const rawConversation = Number(searchParams.get("c"));
  const conversationId = Number.isInteger(rawConversation) && rawConversation > 0 ? rawConversation : null;
  const search = searchParams.toString();
  const context = useMemo(() => contextFromParams(new URLSearchParams(search)), [search]);

  const selectConversation = useCallback((id: number | null) => {
    setUrlParams((params) => (id === null ? params.delete("c") : params.set("c", String(id))), true);
    setListOpen(false);
  }, []);
  const onConversationCreated = useCallback(
    (id: number) => setUrlParams((params) => params.set("c", String(id))),
    [],
  );
  const clearContext = useCallback(
    () =>
      setUrlParams((params) => {
        for (const key of ["resource", "record", "view", "tab", "filter", "q", "dashboard"]) params.delete(key);
      }),
    [],
  );

  if (!me) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-7 sm:px-6" aria-busy>
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
    );
  }
  if (!allowed) return <NoAccess />;

  if (status.isError) {
    return <ErrorState title={t("statusLoadFailed")} error={status.error} onRetry={() => status.refetch()} />;
  }
  if (status.isPending) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-7 sm:px-6" aria-busy>
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
    );
  }

  const { data } = status;

  if (!data.enabled) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("offTitle")}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t("offDescription")}</p>
      </div>
    );
  }

  const list = (
    <ConversationList activeId={conversationId} onSelect={selectConversation} disabled={sending} />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("title")} description={t("description", { days: data.keep_days })}>
        <p className="text-right font-mono text-xs text-muted-foreground">
          {t("usageToday", {
            messages: format.number(data.usage_today.messages),
            limit: format.number(data.limits.daily_messages),
          })}
        </p>
        <Button variant="outline" className="md:hidden" onClick={() => setListOpen(true)}>
          <MessagesSquareIcon />
          {t("conversations.label")}
        </Button>
      </PageHeader>

      {data.can_view_usage ? (
        <div role="tablist" aria-label={t("tabsLabel")} className="flex shrink-0 gap-1 border-b px-4 sm:px-6">
          {(["chat", "usage"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "relative h-9 px-2.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground",
                "after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent",
                tab === key && "font-medium text-foreground after:bg-brand",
              )}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>
      ) : (
        <div className="shrink-0 border-b" />
      )}

      {tab === "usage" && data.can_view_usage ? (
        <UsageReport />
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-64 shrink-0 flex-col border-r md:flex">{list}</aside>
          <ChatPanel
            conversationId={conversationId}
            status={data}
            context={hasContextParams(searchParams) ? context : null}
            onClearContext={clearContext}
            onConversationCreated={onConversationCreated}
            onSendingChange={setSending}
          />
        </div>
      )}

      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent side="left" className="gap-0 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>{t("conversations.label")}</SheetTitle>
            <SheetDescription className="sr-only">{t("conversations.sheetDescription")}</SheetDescription>
          </SheetHeader>
          {list}
        </SheetContent>
      </Sheet>
    </div>
  );
}
