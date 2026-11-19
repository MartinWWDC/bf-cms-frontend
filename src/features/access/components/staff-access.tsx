"use client";

import { useMemo, useState } from "react";
import { SearchIcon, ShieldOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ErrorState } from "@/components/error-state";
import { SimpleSelect } from "@/components/simple-select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/session/hooks/use-permissions";
import type { Tone } from "@/lib/api/types";

import { useResetTwoFactor, useUpdateAdminOverrides, useUpdateAdminRoles } from "../mutations";
import { useAdminAccess, usePermissionCatalogue, useRoles } from "../queries";
import type { AdminAccess, EffectivePermission, OverrideEffect } from "../types";
import { AccessError } from "./access-error";

const sectionHeading =
  "flex items-center gap-3 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase after:h-px after:flex-1 after:bg-border";

const KNOWN_SOURCES = ["super", "deny", "allow", "role", "none"] as const;
const SOURCE_TONE: Record<(typeof KNOWN_SOURCES)[number], Tone> = {
  super: "warning",
  deny: "danger",
  allow: "success",
  role: "info",
  none: "neutral",
};

/** Roles, personal overrides, effective access and the two-factor reset of one staff member. */
export function StaffAccess({ adminId }: { adminId: number }) {
  const t = useTranslations("access.staff");
  const access = useAdminAccess(adminId);

  if (access.isError) {
    return <ErrorState title={t("accessLoadFailed")} error={access.error} onRetry={() => access.refetch()} />;
  }
  if (access.isPending) {
    return (
      <div className="flex flex-col gap-3 px-5 py-6 sm:px-7">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-8" />
        ))}
      </div>
    );
  }
  // Remount when the server state changes, so the drafts start from what was saved.
  return <AccessEditor key={JSON.stringify([access.data.roles, access.data.overrides])} access={access.data} />;
}

function AccessEditor({ access }: { access: AdminAccess }) {
  const t = useTranslations("access.staff");
  const tCommon = useTranslations("common");
  const { can, me } = usePermissions();
  const adminId = access.admin.id;
  const isSelf = me?.id === adminId;
  const roles = useRoles(can("roles.view"));
  const catalogue = usePermissionCatalogue();
  const saveRoles = useUpdateAdminRoles();
  const saveOverrides = useUpdateAdminOverrides();
  const resetTwoFactor = useResetTwoFactor();

  const [roleDraft, setRoleDraft] = useState<string[]>(access.roles);
  const [overrideDraft, setOverrideDraft] = useState<Record<string, OverrideEffect>>(access.overrides);
  const [query, setQuery] = useState("");
  const [onlyOverridden, setOnlyOverridden] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Nobody may change their own access, super admins included (`403 cannot_change_own_access`).
  const canAssign = can("admins.assign_roles") && !isSelf;
  const canOverride = can("admins.override_permissions") && !isSelf;
  // The backend does not stop an admin from resetting their own two-factor; it signs them out.
  const canReset = can("admins.reset_two_factor");

  const rolesChanged = JSON.stringify([...roleDraft].sort()) !== JSON.stringify([...access.roles].sort());
  const overridesChanged = JSON.stringify(sortObject(overrideDraft)) !== JSON.stringify(sortObject(access.overrides));

  // Role names where the admin may read roles; the keys otherwise.
  const roleChoices = useMemo(() => {
    const known = roles.data ?? [];
    const keys = new Set([...known.map((role) => role.key), ...access.roles]);
    return [...keys].map((key) => {
      const role = known.find((entry) => entry.key === key);
      return { key, name: role?.name ?? key, isSuper: role?.is_super ?? false };
    });
  }, [roles.data, access.roles]);

  const groupLabels = useMemo(
    () => new Map((catalogue.data ?? []).map((group) => [group.group, group.label])),
    [catalogue.data],
  );
  const groups = useMemo(() => {
    const text = query.trim().toLowerCase();
    const byGroup = new Map<string, EffectivePermission[]>();
    for (const entry of access.effective) {
      if (onlyOverridden && !(entry.permission in overrideDraft)) continue;
      const label = groupLabels.get(entry.group) ?? entry.group;
      if (
        text &&
        !entry.label.toLowerCase().includes(text) &&
        !entry.permission.toLowerCase().includes(text) &&
        !label.toLowerCase().includes(text)
      ) {
        continue;
      }
      byGroup.set(entry.group, [...(byGroup.get(entry.group) ?? []), entry]);
    }
    return [...byGroup].map(([group, entries]) => ({ group, label: groupLabels.get(group) ?? group, entries }));
  }, [access.effective, groupLabels, query, onlyOverridden, overrideDraft]);

  const setOverride = (permission: string, effect: OverrideEffect | null) =>
    setOverrideDraft((current) => {
      const next = { ...current };
      if (effect === null) delete next[permission];
      else next[permission] = effect;
      return next;
    });

  const sourceLabel = (source: string) =>
    (KNOWN_SOURCES as readonly string[]).includes(source) ? t(`source.${source as (typeof KNOWN_SOURCES)[number]}`) : source;

  return (
    <div className="flex flex-col gap-7 px-5 py-6 sm:px-7">
      {isSelf ? <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{t("ownAccess")}</p> : null}

      <section className="flex flex-col gap-3">
        <h3 className={sectionHeading}>{t("roles")}</h3>
        <AccessError error={saveRoles.error} />
        {roleChoices.length === 0 ? <p className="text-sm text-muted-foreground">{t("noRoles")}</p> : null}
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {roleChoices.map((role) => (
            <li key={role.key}>
              <label className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                <Checkbox
                  checked={roleDraft.includes(role.key)}
                  disabled={!canAssign || saveRoles.isPending}
                  onCheckedChange={(checked) =>
                    setRoleDraft((current) =>
                      checked === true ? [...current, role.key] : current.filter((key) => key !== role.key),
                    )
                  }
                />
                <span className="min-w-0 flex-1 truncate">{role.name}</span>
                {role.isSuper ? <StatusBadge label={t("superRole")} tone="warning" /> : null}
              </label>
            </li>
          ))}
        </ul>
        {canAssign ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" disabled={!rolesChanged} onClick={() => setRoleDraft(access.roles)}>
              {t("revert")}
            </Button>
            <Button
              size="sm"
              disabled={!rolesChanged || saveRoles.isPending}
              onClick={() =>
                saveRoles.mutate({ adminId, roles: roleDraft }, { onSuccess: () => toast.success(t("rolesSaved")) })
              }
            >
              {t("saveRoles")}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className={sectionHeading}>{t("permissions")}</h3>
        <p className="text-sm text-muted-foreground">
          {access.is_super_admin ? t("superAdminNote") : t("permissionsHint")}
        </p>
        <AccessError error={saveOverrides.error} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPermissions")}
              aria-label={t("searchPermissions")}
              className="bg-card pl-8"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={onlyOverridden} onCheckedChange={(checked) => setOnlyOverridden(checked === true)} />
            {t("onlyOverridden", { count: Object.keys(overrideDraft).length })}
          </label>
        </div>

        {groups.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{t("noPermissions")}</p> : null}

        {groups.map((group) => (
          <div key={group.group} className="overflow-hidden rounded-md border">
            <p className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5 text-sm font-medium">
              {group.label}
              <code className="font-mono text-xs font-normal text-muted-foreground">{group.group}</code>
            </p>
            <ul className="divide-y">
              {group.entries.map((entry) => {
                const draft = overrideDraft[entry.permission] ?? null;
                const tone = (SOURCE_TONE as Record<string, Tone>)[entry.source] ?? "neutral";
                return (
                  <li key={entry.permission} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-sm">
                    <span className="min-w-40 flex-1">
                      <span className="block">{entry.label}</span>
                      <code className="block font-mono text-[0.6875rem] break-all text-muted-foreground">
                        {entry.permission}
                      </code>
                    </span>
                    <StatusBadge
                      label={`${entry.allowed ? t("allowed") : t("denied")} · ${sourceLabel(entry.source)}`}
                      tone={entry.allowed ? tone : entry.source === "deny" ? "danger" : "neutral"}
                    />
                    <SimpleSelect
                      size="sm"
                      className="w-36"
                      aria-label={t("overrideFor", { permission: entry.label })}
                      disabled={!canOverride || saveOverrides.isPending}
                      value={draft ?? "inherit"}
                      options={[
                        { value: "inherit", label: t("override.inherit") },
                        { value: "allow", label: t("override.allow") },
                        { value: "deny", label: t("override.deny") },
                      ]}
                      onChange={(next) => setOverride(entry.permission, next === "allow" || next === "deny" ? next : null)}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {canOverride ? (
          <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-2 border-t bg-popover px-5 py-3 sm:-mx-7 sm:px-7">
            {overridesChanged ? <span className="mr-auto text-xs text-muted-foreground">{t("unsavedOverrides")}</span> : null}
            <Button variant="outline" size="sm" disabled={!overridesChanged} onClick={() => setOverrideDraft(access.overrides)}>
              {t("revert")}
            </Button>
            <Button
              size="sm"
              disabled={!overridesChanged || saveOverrides.isPending}
              onClick={() =>
                saveOverrides.mutate(
                  { adminId, overrides: overrideDraft },
                  { onSuccess: () => toast.success(t("overridesSaved")) },
                )
              }
            >
              {t("saveOverrides")}
            </Button>
          </div>
        ) : null}
      </section>

      {canReset ? (
        <section className="flex flex-col gap-3">
          <h3 className={sectionHeading}>{t("twoFactor")}</h3>
          <p className="text-sm text-muted-foreground">{t("resetHint")}</p>
          <Button
            variant="destructive"
            className="self-start"
            onClick={() => {
              resetTwoFactor.reset();
              setConfirmReset(true);
            }}
          >
            <ShieldOffIcon />
            {t("reset")}
          </Button>
        </section>
      ) : null}

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("resetTitle", { name: access.admin.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t("resetDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AccessError error={resetTwoFactor.error} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetTwoFactor.isPending}>{tCommon("cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={resetTwoFactor.isPending}
              onClick={() =>
                resetTwoFactor.mutate(adminId, {
                  onSuccess: (result) => {
                    toast.success(t("resetDone", { count: result.revoked_sessions }));
                    setConfirmReset(false);
                  },
                })
              }
            >
              {t("reset")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function sortObject<T>(value: Record<string, T>): [string, T][] {
  return Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
}
