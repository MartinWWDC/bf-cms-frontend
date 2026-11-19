"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/session/hooks/use-permissions";
import { useErrorToast } from "@/lib/api/use-error-message";
import { routes } from "@/lib/routes";

import { useDeleteDashboard } from "../mutations";
import { useDashboards } from "../queries";
import type { DashboardSummary } from "../types";
import { DashboardEditor } from "./dashboard-editor";

/** `?edit=new` or `?edit=personal_{id}` opens the editor. */
function setEditing(key: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (key) params.set("edit", key);
  else params.delete("edit");
  const query = params.toString();
  window.history.pushState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
}

/**
 * The admin's own dashboards: open, create, edit cards and widths, delete. Needs the
 * `dashboards.personal` permission. Must be rendered inside `<Suspense>`.
 */
export function PersonalDashboards() {
  const t = useTranslations("dashboards.personal");
  const tCommon = useTranslations("common");
  const editing = useSearchParams().get("edit");
  const { can, me } = usePermissions();
  const allowed = can("dashboards.personal");
  const dashboards = useDashboards();
  const remove = useDeleteDashboard();
  const toastError = useErrorToast();
  const [deleting, setDeleting] = useState<DashboardSummary | null>(null);
  const personal = dashboards.data?.data.filter((dashboard) => dashboard.type === "personal") ?? [];

  if (editing && allowed) {
    return (
      <DashboardEditor
        key={editing}
        dashboardKey={editing === "new" ? null : editing}
        onDone={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("title")} description={t("description")}>
        {allowed ? (
          <Button onClick={() => setEditing("new")}>
            <PlusIcon />
            {t("create")}
          </Button>
        ) : null}
      </PageHeader>

      {dashboards.isError ? (
        <ErrorState title={t("loadFailed")} error={dashboards.error} onRetry={() => dashboards.refetch()} />
      ) : (
        <div className="flex flex-col gap-2 px-4 pb-6 sm:px-6">
          {me && !allowed ? <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{t("notAllowed")}</p> : null}
          {dashboards.isPending ? (
            <>
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </>
          ) : personal.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="overflow-hidden rounded-lg border bg-card">
              {personal.map((dashboard) => (
                <li key={dashboard.key} className="flex items-center gap-2 border-b px-4 py-2.5 last:border-b-0">
                  <Link
                    href={routes.dashboard(dashboard.key)}
                    className="min-w-0 flex-1 truncate text-sm font-medium underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {dashboard.label}
                  </Link>
                  {allowed ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setEditing(dashboard.key)}>
                        <PencilIcon />
                        {tCommon("edit")}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleting(dashboard)}>
                        <Trash2Icon />
                        {tCommon("delete")}
                      </Button>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription", { name: deleting?.label ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                deleting &&
                remove.mutate(deleting.key, {
                  onSuccess: () => toast.success(t("deleted", { name: deleting.label })),
                  onError: toastError,
                  onSettled: () => setDeleting(null),
                })
              }
            >
              {tCommon("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
