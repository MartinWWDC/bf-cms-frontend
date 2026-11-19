"use client";

import { useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormat } from "@/i18n/use-format";

import { useStaffAccounts } from "../queries";
import type { StaffAccount } from "../types";
import { StaffAccess } from "./staff-access";

const PAGE_SIZES = [25, 50, 100] as const;
const SEARCH_DEBOUNCE_MS = 300;

/** Staff accounts with their roles; a row opens that admin's access. */
export function StaffScreen() {
  const t = useTranslations("access.staff");
  const format = useFormat();
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(50);
  const [selected, setSelected] = useState<StaffAccount | null>(null);
  const [last, setLast] = useState<StaffAccount | null>(null);
  if (selected !== null && selected !== last) setLast(selected);
  const shown = selected ?? last;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staff = useStaffAccounts({ q, page, perPage });

  const search = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setQ(next.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="shrink-0 border-b px-4 pb-3 sm:px-6">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={draft}
            onChange={(event) => search(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="bg-card pl-8"
          />
        </div>
      </div>

      {staff.isError ? (
        <ErrorState title={t("loadFailed")} error={staff.error} onRetry={() => staff.refetch()} />
      ) : (
        <div className="scrollbar-slim min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("roles")}</TableHead>
                <TableHead>{t("twoFactor")}</TableHead>
                <TableHead>{t("created")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.isPending ? (
                Array.from({ length: 8 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-5" />
                    </TableCell>
                  </TableRow>
                ))
              ) : staff.data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                staff.data.data.map((account) => (
                  <TableRow
                    key={account.id}
                    tabIndex={0}
                    data-state={selected?.id === account.id ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => setSelected(account)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setSelected(account);
                    }}
                  >
                    <TableCell className="font-medium">{account.name ?? `#${account.id}`}</TableCell>
                    <TableCell>{account.email}</TableCell>
                    <TableCell>
                      {account.roles.length === 0 ? (
                        <span className="text-muted-foreground">{t("noRolesShort")}</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {account.roles.map((role) => (
                            <span key={role} className="rounded-sm border bg-card px-1.5 py-0.5 font-mono text-xs">
                              {role}
                            </span>
                          ))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={account.two_factor_enabled ? t("twoFactorOn") : t("twoFactorOff")}
                        tone={account.two_factor_enabled ? "success" : "warning"}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {account.created_at ? format.date(account.created_at) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <DataTablePagination
        page={page}
        pageSize={perPage}
        total={staff.data?.meta.total ?? 0}
        totalCapped={staff.data?.meta.total_capped ?? false}
        hasMore={staff.data?.meta.has_more ?? false}
        pageSizes={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPerPage(next);
          setPage(1);
        }}
        disabled={staff.isPending}
      />

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent
          side="right"
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[min(calc(100vw-3rem),52rem)] data-[side=right]:sm:max-w-none"
        >
          {shown ? (
            <>
              <SheetHeader className="gap-1 border-b px-5 pt-5 pb-4 pr-14 sm:px-7">
                <SheetTitle className="text-xl leading-tight font-semibold tracking-tight">
                  {shown.name ?? `#${shown.id}`}
                </SheetTitle>
                <SheetDescription>{shown.email}</SheetDescription>
              </SheetHeader>
              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                <StaffAccess adminId={shown.id} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
