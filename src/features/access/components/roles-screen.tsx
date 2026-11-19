"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/features/session/hooks/use-permissions";
import { useFormat } from "@/i18n/use-format";

import { useDeleteRole } from "../mutations";
import { useRoles } from "../queries";
import type { Role } from "../types";
import { AccessError } from "./access-error";
import { RoleForm } from "./role-form";

type Editing = { mode: "create" } | { mode: "edit"; role: Role };

/**
 * Roles are made by admins: list, create, edit and delete them, and choose their
 * permissions from the catalogue. Only the super admin role is built in.
 */
export function RolesScreen() {
  const t = useTranslations("access.roles");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const { can } = usePermissions();
  const roles = useRoles();
  const remove = useDeleteRole();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);
  // Keep the form mounted while the sheet animates closed.
  const [lastEditing, setLastEditing] = useState<Editing | null>(null);
  if (editing !== null && editing !== lastEditing) setLastEditing(editing);
  const shown = editing ?? lastEditing;

  const canCreate = can("roles.create");
  const canUpdate = can("roles.update");
  const canDelete = can("roles.delete");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("title")} description={t("subtitle")}>
        {canCreate ? (
          <Button onClick={() => setEditing({ mode: "create" })}>
            <PlusIcon />
            {t("new")}
          </Button>
        ) : null}
      </PageHeader>

      {roles.isError ? (
        <ErrorState title={t("loadFailed")} error={roles.error} onRetry={() => roles.refetch()} />
      ) : (
        <div className="px-4 pb-6 sm:px-6">
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead className="text-right">{t("permissionCount")}</TableHead>
                  <TableHead className="text-right">{t("staffCount")}</TableHead>
                  <TableHead>{t("updated")}</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.isPending ? (
                  Array.from({ length: 4 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-5" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : roles.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.data.map((role) => (
                    <TableRow
                      key={role.id}
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() => setEditing({ mode: "edit", role })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") setEditing({ mode: "edit", role });
                      }}
                    >
                      <TableCell>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{role.name}</span>
                          {role.is_super ? <StatusBadge label={t("superBadge")} tone="warning" /> : null}
                          {role.is_system ? <StatusBadge label={t("systemBadge")} /> : null}
                        </span>
                        <span className="block font-mono text-xs text-muted-foreground">{role.key}</span>
                      </TableCell>
                      <TableCell className="max-w-80 truncate text-muted-foreground">{role.description ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {role.is_super || role.permissions.includes("*") ? t("all") : format.number(role.permissions.length)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{format.number(role.admins_count)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {role.updated_at ? format.dateTime(role.updated_at) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canDelete && !role.is_system ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("deleteRole", { name: role.name })}
                            onClick={(event) => {
                              event.stopPropagation();
                              remove.reset();
                              setDeleting(role);
                            }}
                          >
                            <Trash2Icon />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent
          side="right"
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[min(calc(100vw-3rem),48rem)] data-[side=right]:sm:max-w-none"
        >
          {shown ? (
            <>
              <SheetHeader className="gap-1 border-b px-5 pt-5 pb-4 pr-14 sm:px-7">
                <SheetTitle className="text-xl leading-tight font-semibold tracking-tight">
                  {shown.mode === "edit" ? shown.role.name : t("new")}
                </SheetTitle>
                <SheetDescription>{shown.mode === "edit" ? t("editDescription") : t("createDescription")}</SheetDescription>
              </SheetHeader>
              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                <RoleForm
                  key={shown.mode === "edit" ? `${shown.role.id}-${shown.role.updated_at}` : "new"}
                  role={shown.mode === "edit" ? shown.role : null}
                  canSave={shown.mode === "edit" ? canUpdate : canCreate}
                  onCancel={() => setEditing(null)}
                  onSaved={() => setEditing(null)}
                />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle", { name: deleting?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AccessError error={remove.error} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending || deleting === null}
              onClick={() => {
                if (!deleting) return;
                remove.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success(t("deleted", { name: deleting.name }));
                    setDeleting(null);
                  },
                });
              }}
            >
              {tCommon("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
