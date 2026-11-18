"use client";

import { useRef, useState } from "react";
import type { ColumnVisibilityState } from "@tanstack/react-table";
import { Columns3Icon, RotateCwIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import type { FieldDefinition, ListTab } from "../types";

const SEARCH_DEBOUNCE_MS = 300;

interface ResourceToolbarProps {
  tabs: ListTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder?: string;
  columns: FieldDefinition[];
  columnVisibility: ColumnVisibilityState;
  onColumnVisibilityChange: (visibility: ColumnVisibilityState) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function ResourceToolbar({
  tabs,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  searchPlaceholder,
  columns,
  columnVisibility,
  onColumnVisibilityChange,
  onRefresh,
  isRefreshing,
}: ResourceToolbarProps) {
  const t = useTranslations("resources.toolbar");

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b px-4 pt-1 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder ?? t("search")}
          clearLabel={t("clearSearch")}
        />

        <div className="flex items-center gap-2 sm:ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <Columns3Icon />
              {t("columns")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("visibleColumns")}</DropdownMenuLabel>
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={columnVisibility[column.key] !== false}
                    closeOnClick={false}
                    onCheckedChange={(checked) =>
                      onColumnVisibilityChange({ ...columnVisibility, [column.key]: checked })
                    }
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <RotateCwIcon className={cn(isRefreshing && "animate-spin")} />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {tabs.length > 0 ? (
        <div role="tablist" aria-label={t("views")} className="scrollbar-slim -mx-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  "relative h-9 shrink-0 px-2.5 text-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground",
                  "after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent",
                  isActive && "font-medium text-foreground after:bg-brand",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  clearLabel: string;
}

/**
 * Search box that types instantly but reports changes debounced, so each keystroke does
 * not become a request. Remount it (via `key`) to reset it from outside.
 */
function SearchField({ value, onChange, placeholder, clearLabel }: SearchFieldProps) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = (next: string, immediate = false) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    if (immediate) onChange(next);
    else timer.current = setTimeout(() => onChange(next), SEARCH_DEBOUNCE_MS);
  };

  return (
    <div className="relative w-full sm:max-w-sm">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={draft}
        onChange={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit(draft, true);
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="bg-card pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => commit("", true)}
          className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
