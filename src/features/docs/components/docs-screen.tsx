"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { renderMarkdown } from "@/components/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorStatus } from "@/lib/api/client";
import { routes } from "@/lib/routes";

import { useDocument, useDocuments } from "../queries";

/**
 * The API documents of the deployed build, read through `GET /docs`. They always match
 * the deployed code. Must be rendered inside `<Suspense>`: the open document is in the URL.
 */
export function DocsScreen() {
  const t = useTranslations("docs");
  const router = useRouter();
  const requested = useSearchParams().get("doc");
  const documents = useDocuments();
  const readable = useMemo(
    () => (documents.data ?? []).filter((document) => document.format === "markdown"),
    [documents.data],
  );
  const current = readable.find((document) => document.name === requested) ?? readable[0] ?? null;
  const content = useDocument(current?.name ?? null);
  const blocks = useMemo(() => (content.data ? renderMarkdown(content.data) : null), [content.data]);

  if (documents.isError) {
    return getApiErrorStatus(documents.error) === 404 ? (
      <ErrorState title={t("disabledTitle")} message={t("disabledHint")} />
    ) : (
      <ErrorState title={t("loadFailed")} error={documents.error} onRetry={() => documents.refetch()} />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-8 sm:px-6 lg:flex-row lg:gap-8">
        <nav aria-label={t("documents")} className="shrink-0 lg:w-56">
          {documents.isPending ? (
            <Skeleton className="h-40" />
          ) : (
            <ul className="scrollbar-slim flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {readable.map((document) => (
                <li key={document.name}>
                  <button
                    type="button"
                    aria-current={document.name === current?.name ? "page" : undefined}
                    onClick={() => router.replace(`${routes.docs}?doc=${encodeURIComponent(document.name)}`)}
                    className={cn(
                      "w-full rounded-md px-2.5 py-1.5 text-left text-sm whitespace-nowrap text-muted-foreground outline-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:whitespace-normal",
                      document.name === current?.name && "bg-accent font-medium text-foreground",
                    )}
                  >
                    {document.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
        <article className="flex min-w-0 max-w-3xl flex-1 flex-col gap-3 text-sm leading-relaxed">
          {content.isError ? (
            <ErrorState title={t("loadFailed")} error={content.error} onRetry={() => content.refetch()} />
          ) : blocks ? (
            blocks
          ) : documents.isSuccess && !current ? (
            <p className="text-muted-foreground">{t("empty")}</p>
          ) : (
            <>
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4 w-2/3" />
            </>
          )}
        </article>
      </div>
    </div>
  );
}
