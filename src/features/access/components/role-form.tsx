"use client";

import { type FormEvent, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ErrorState } from "@/components/error-state";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/features/session/queries";
import { isApiError } from "@/lib/api/client";

import { sameSet } from "../lib/permissions";
import { useSaveRole, useUpdateRoleHomeDashboard } from "../mutations";
import { useDashboardOptions, usePermissionCatalogue, useRoleHomeDashboard } from "../queries";
import type { Role, RoleInput } from "../types";
import { AccessError } from "./access-error";
import { PermissionPicker } from "./permission-picker";

interface RoleFormProps {
  /** The role being edited; `null` creates one. */
  role: Role | null;
  /** The admin may change roles (`roles.update` / `roles.create`). */
  canSave: boolean;
  onSaved: (role: Role) => void;
  onCancel: () => void;
}

const NO_DASHBOARD = "";

/** Name, description, super access, permissions and the home dashboard of one role. */
export function RoleForm({ role, canSave, onSaved, onCancel }: RoleFormProps) {
  const t = useTranslations("access.roles");
  const tCommon = useTranslations("common");
  const formId = useId();
  const { data: me } = useMe();
  const catalogue = usePermissionCatalogue();
  const save = useSaveRole();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [isSuper, setIsSuper] = useState(role?.is_super ?? false);
  const [initialPermissions] = useState(() => new Set(role?.permissions ?? []));
  const [permissions, setPermissions] = useState<Set<string>>(initialPermissions);

  const fieldErrors = isApiError(save.error) ? save.error.fields : {};
  const readOnly = !canSave || save.isPending;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || name.trim().length < 2) return;
    // Only what changed: an unchanged super flag must not ask for super-admin rights.
    const input: RoleInput = {};
    if (!role || name.trim() !== role.name) input.name = name.trim();
    if (!role || (description.trim() || null) !== role.description) input.description = description.trim() || null;
    if (!role || !sameSet(permissions, initialPermissions)) input.permissions = [...permissions].sort();
    if (role ? isSuper !== role.is_super : isSuper) input.is_super = isSuper;
    if (role && Object.keys(input).length === 0) {
      onSaved(role);
      return;
    }
    save.mutate(
      { id: role?.id, input },
      {
        onSuccess: (saved) => {
          toast.success(role ? t("saved", { name: saved.name }) : t("created", { name: saved.name }));
          onSaved(saved);
        },
      },
    );
  };

  return (
    <form id={formId} onSubmit={submit} className="flex flex-col gap-6 px-5 py-6 sm:px-7" noValidate>
      <AccessError error={save.error} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${formId}-name`}>
          {t("name")}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${formId}-name`}
          value={name}
          maxLength={120}
          disabled={readOnly}
          aria-invalid={Boolean(fieldErrors.name) || undefined}
          onChange={(event) => setName(event.target.value)}
          className="bg-card"
        />
        {role ? (
          <p className="font-mono text-xs text-muted-foreground">{role.key}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("keyHint")}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${formId}-description`}>{t("description")}</Label>
        <Textarea
          id={`${formId}-description`}
          rows={2}
          maxLength={500}
          value={description}
          disabled={readOnly}
          onChange={(event) => setDescription(event.target.value)}
          className="bg-card"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor={`${formId}-super`}>{t("super")}</Label>
          <Switch
            id={`${formId}-super`}
            checked={isSuper}
            disabled={readOnly || !me?.is_super_admin}
            onCheckedChange={(checked) => setIsSuper(checked)}
          />
        </div>
        <p className="text-xs text-muted-foreground">{me?.is_super_admin ? t("superHint") : t("superLocked")}</p>
      </div>

      {role ? <HomeDashboard roleId={role.id} canSave={canSave} /> : null}

      <section aria-labelledby={`${formId}-permissions`} className="flex flex-col gap-2">
        <h3
          id={`${formId}-permissions`}
          className="flex items-center gap-3 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase after:h-px after:flex-1 after:bg-border"
        >
          {t("permissions")}
        </h3>
        {isSuper ? <p className="text-sm text-muted-foreground">{t("superCoversAll")}</p> : null}
        {catalogue.isError ? (
          <ErrorState
            title={t("catalogueLoadFailed")}
            error={catalogue.error}
            onRetry={() => catalogue.refetch()}
            className="min-h-32"
          />
        ) : catalogue.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : (
          <PermissionPicker catalogue={catalogue.data} value={permissions} onChange={setPermissions} disabled={readOnly} />
        )}
      </section>

      <div className="sticky bottom-0 -mx-5 -mb-6 flex items-center justify-end gap-2 border-t bg-popover px-5 py-3 sm:-mx-7 sm:px-7">
        <Button type="button" variant="outline" onClick={onCancel} disabled={save.isPending}>
          {canSave ? tCommon("cancel") : tCommon("close")}
        </Button>
        {canSave ? (
          <Button type="submit" disabled={save.isPending || name.trim().length < 2}>
            {save.isPending ? t("saving") : role ? tCommon("save") : t("create")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** The dashboard this role opens after login. Saved on its own, as soon as it is chosen. */
function HomeDashboard({ roleId, canSave }: { roleId: number; canSave: boolean }) {
  const t = useTranslations("access.roles");
  const id = useId();
  const home = useRoleHomeDashboard(roleId);
  const options = useDashboardOptions();
  const update = useUpdateRoleHomeDashboard();

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{t("homeDashboard")}</Label>
      {home.isPending || options.isPending ? (
        <Skeleton className="h-8" />
      ) : home.isError || options.isError ? (
        <p className="text-sm text-destructive">{t("homeDashboardLoadFailed")}</p>
      ) : (
        <SimpleSelect
          id={id}
          disabled={!canSave || update.isPending}
          value={home.data.dashboard ?? NO_DASHBOARD}
          options={[
            { value: NO_DASHBOARD, label: t("noHomeDashboard") },
            ...options.data.map((dashboard) => ({ value: dashboard.key, label: dashboard.label })),
          ]}
          onChange={(next) =>
            update.mutate(
              { roleId, dashboard: next === NO_DASHBOARD ? null : next },
              { onSuccess: () => toast.success(t("homeDashboardSaved")) },
            )
          }
        />
      )}
      <AccessError error={update.error} />
      <p className="text-xs text-muted-foreground">{t("homeDashboardHint")}</p>
    </div>
  );
}
