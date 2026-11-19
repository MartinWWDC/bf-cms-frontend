"use client";

import { useTranslations } from "next-intl";

import { isApiError } from "@/lib/api/client";
import { useErrorMessage } from "@/lib/api/use-error-message";

/**
 * A refused access change. The backend's message says why (`cannot_change_own_access`,
 * `super_admin_required`, `last_super_admin`, `system_role`, ...); two codes carry details
 * worth showing: the permissions the admin may not hand out, and how many staff hold a role.
 */
export function AccessError({ error }: { error: unknown }) {
  const t = useTranslations("access.errors");
  const errorMessage = useErrorMessage();
  if (!error) return null;

  const details = isApiError(error) ? error.details : {};
  const permissions = Array.isArray(details.permissions) ? details.permissions.map(String) : [];
  const admins = typeof details.admins === "number" ? details.admins : null;
  const fields = isApiError(error) ? Object.values(error.fields).flat() : [];

  return (
    <div role="alert" className="flex flex-col gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <p>{errorMessage(error)}</p>
      {fields.length > 0 ? (
        <ul className="list-disc pl-5">
          {fields.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      ) : null}
      {permissions.length > 0 ? (
        <p>
          {t("beyondOwnAccess")}{" "}
          {permissions.map((permission) => (
            <code key={permission} className="mr-1 rounded-sm bg-destructive/10 px-1 font-mono text-xs">
              {permission}
            </code>
          ))}
        </p>
      ) : null}
      {admins !== null ? <p>{t("roleInUse", { count: admins })}</p> : null}
      {isApiError(error) && error.requestId ? (
        <p className="font-mono text-xs opacity-80 select-all">{error.requestId}</p>
      ) : null}
    </div>
  );
}
