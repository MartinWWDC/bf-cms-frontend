"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { useFormat } from "@/i18n/use-format";
import { useErrorToast } from "@/lib/api/use-error-message";

import { useRevokeSession } from "../mutations";
import { useSessions } from "../queries";

/** The admin's active sessions, with a way to end one (`GET /auth/sessions`). */
export function SessionsScreen() {
  const t = useTranslations("account.sessions");
  const format = useFormat();
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const toastError = useErrorToast();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("title")} description={t("description")} />
      {sessions.isError ? (
        <ErrorState title={t("loadFailed")} error={sessions.error} onRetry={() => sessions.refetch()} />
      ) : (
        <div className="px-4 pb-6 sm:px-6">
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("device")}</TableHead>
                  <TableHead>{t("ip")}</TableHead>
                  <TableHead>{t("signedIn")}</TableHead>
                  <TableHead>{t("lastUsed")}</TableHead>
                  <TableHead>{t("expires")}</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.isPending
                  ? Array.from({ length: 3 }, (_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-5" />
                        </TableCell>
                      </TableRow>
                    ))
                  : sessions.data.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="max-w-80">
                          <span className="flex items-center gap-2">
                            <span className="truncate" title={session.user_agent ?? undefined}>
                              {session.user_agent ?? t("unknownDevice")}
                            </span>
                            {session.current ? <StatusBadge label={t("current")} tone="success" /> : null}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{session.ip ?? "—"}</TableCell>
                        <TableCell>{session.created_at ? format.dateTime(session.created_at) : "—"}</TableCell>
                        <TableCell>{session.last_used_at ? format.dateTime(session.last_used_at) : "—"}</TableCell>
                        <TableCell>{format.dateTime(session.expires_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={revoke.isPending}
                            onClick={() =>
                              revoke.mutate(session.id, {
                                onSuccess: () => toast.success(t("revoked")),
                                onError: toastError,
                              })
                            }
                          >
                            {session.current ? t("signOutHere") : t("revoke")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
