"use client";

import { useState } from "react";
import { ChevronRightIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import {
  ALL,
  countInGroup,
  covers,
  coversGroup,
  filterCatalogue,
  toggleGroup,
  togglePermission,
} from "../lib/permissions";
import type { PermissionGroup } from "../types";

interface PermissionPickerProps {
  catalogue: PermissionGroup[];
  /** Granted keys, wildcards included. */
  value: ReadonlySet<string>;
  onChange: (value: Set<string>) => void;
  disabled?: boolean;
}

/**
 * The permission catalogue as groups with a tick per permission. A fully ticked group is
 * stored as its wildcard (`colors.*`), so permissions added to it later are covered too.
 */
export function PermissionPicker({ catalogue, value, onChange, disabled = false }: PermissionPickerProps) {
  const t = useTranslations("access.permissions");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const groups = filterCatalogue(catalogue, query);
  const searching = query.trim() !== "";
  const everything = value.has(ALL);
  const total = catalogue.reduce((sum, group) => sum + group.permissions.length, 0);
  const granted = catalogue.reduce((sum, group) => sum + countInGroup(value, group), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="bg-card pl-8"
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{t("count", { granted, total })}</span>
      </div>

      <label className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <Checkbox
          checked={everything}
          disabled={disabled}
          onCheckedChange={(checked) => onChange(checked === true ? new Set([ALL]) : new Set())}
        />
        <span className="font-medium">{t("everything")}</span>
        <code className="font-mono text-xs text-muted-foreground">*</code>
      </label>

      {groups.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{t("noMatches")}</p> : null}

      <ul className="flex flex-col divide-y rounded-md border">
        {groups.map((group) => {
          // The search can narrow a group's permissions; ticks always act on the whole group.
          const full = catalogue.find((entry) => entry.group === group.group) ?? group;
          const count = countInGroup(value, full);
          const all = coversGroup(value, full);
          const isOpen = searching || (open[group.group] ?? false);
          return (
            <li key={group.group}>
              <div className="flex items-center gap-2 px-3 py-2">
                <Checkbox
                  checked={all}
                  indeterminate={!all && count > 0}
                  disabled={disabled}
                  aria-label={t("selectGroup", { group: group.label })}
                  onCheckedChange={(checked) => onChange(toggleGroup(value, catalogue, full, checked === true))}
                />
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen((current) => ({ ...current, [group.group]: !isOpen }))}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm outline-none focus-visible:underline"
                >
                  <ChevronRightIcon className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                  <span className="truncate font-medium">{group.label}</span>
                  <code className="hidden font-mono text-xs text-muted-foreground sm:inline">{group.group}</code>
                  <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
                    {count}/{full.permissions.length}
                  </span>
                </button>
              </div>
              {isOpen ? (
                <ul className="grid grid-cols-1 gap-x-4 gap-y-1 border-t bg-muted/30 px-3 py-2 pl-9 sm:grid-cols-2">
                  {group.permissions.map((permission) => (
                    <li key={permission.key}>
                      <label className="flex items-start gap-2 text-sm">
                        <Checkbox
                          className="mt-0.5"
                          checked={covers(value, full, permission.key)}
                          disabled={disabled}
                          onCheckedChange={(checked) =>
                            onChange(togglePermission(value, catalogue, full, permission.key, checked === true))
                          }
                        />
                        <span className="min-w-0">
                          <span className="block">{permission.label}</span>
                          <code className="block font-mono text-[0.6875rem] break-all text-muted-foreground">
                            {permission.key}
                          </code>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
