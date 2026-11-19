"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface PickerOption {
  value: string;
  label: string;
  hint?: string;
}

interface SearchPickerProps {
  /** Label of the current choice; `null` when nothing is chosen. */
  selectedLabel: string | null;
  selectedValue?: string | null;
  options: PickerOption[];
  /** Called (debounced) with the text typed in the search box. */
  onSearch: (query: string) => void;
  onSelect: (option: PickerOption) => void;
  /** Shows a clear button when given and something is chosen. */
  onClear?: () => void;
  isLoading?: boolean;
  placeholder: string;
  searchPlaceholder?: string;
  /** Options shown above the search results, e.g. "Me". */
  pinned?: PickerOption[];
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  size?: "sm" | "default";
  className?: string;
  /** Replaces the default trigger content. */
  children?: ReactNode;
}

const SEARCH_DEBOUNCE_MS = 250;

/**
 * A combobox whose options come from a server search: linked records, staff.
 * It only shows and reports choices; the caller owns the search request.
 */
export function SearchPicker({
  selectedLabel,
  selectedValue,
  options,
  onSearch,
  onSelect,
  onClear,
  isLoading,
  placeholder,
  searchPlaceholder,
  pinned = [],
  disabled,
  invalid,
  id,
  size = "default",
  className,
  children,
}: SearchPickerProps) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const search = (next: string) => {
    setQuery(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(next.trim()), SEARCH_DEBOUNCE_MS);
  };

  const choose = (option: PickerOption) => {
    onSelect(option);
    setOpen(false);
  };

  const all = [...pinned, ...options.filter((option) => !pinned.some((entry) => entry.value === option.value))];

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          onSearch("");
        }
      }}
    >
      <div className={cn("relative flex min-w-0", className)}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "flex w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-card pr-2 pl-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30",
            size === "sm" ? "h-7" : "h-8",
            onClear && selectedLabel ? "pr-8" : undefined,
          )}
        >
          {children ?? (
            <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
              {selectedLabel ?? placeholder}
            </span>
          )}
          {onClear && selectedLabel ? null : <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />}
        </PopoverTrigger>
        {onClear && selectedLabel ? (
          <button
            type="button"
            aria-label={t("clear")}
            disabled={disabled}
            onClick={onClear}
            className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
      <PopoverContent align="start" className="w-72 gap-1.5 p-1.5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => search(event.target.value)}
            placeholder={searchPlaceholder ?? t("search")}
            aria-label={searchPlaceholder ?? t("search")}
            className="h-8 w-full rounded-md border border-input bg-transparent pr-2 pl-7 text-sm outline-none focus-visible:border-ring"
          />
        </div>
        <ul role="listbox" className="scrollbar-slim max-h-60 overflow-y-auto">
          {all.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === selectedValue}>
              <button
                type="button"
                onClick={() => choose(option)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.hint ? (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{option.hint}</span>
                ) : null}
                {option.value === selectedValue ? <CheckIcon className="size-3.5 shrink-0" /> : null}
              </button>
            </li>
          ))}
          {all.length === 0 ? (
            <li className="px-2 py-3 text-center text-sm text-muted-foreground">
              {isLoading ? t("loading") : t("noMatches")}
            </li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
