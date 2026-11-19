"use client";

import { useCallback } from "react";

import { hasPermission } from "../lib/permissions";
import { useMe } from "../queries/use-me";

/**
 * Checks a permission key against `/me`.
 *
 * Normal screens do not need this: the navigation, the resource contract, `meta.abilities`
 * and `meta.actions` are already filtered by the backend. Use it only for the few fixed
 * features that are gated by a key (`assistant.use`, `tasks.view_all`, `dashboards.personal`).
 */
export function usePermissions() {
  const { data: me } = useMe();

  const can = useCallback(
    (permission: string) => (me ? me.is_super_admin || hasPermission(me.permissions, permission) : false),
    [me],
  );

  return { can, me };
}
