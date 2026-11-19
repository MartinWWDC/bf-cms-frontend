"use client";

import { useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

const SEARCH_DEBOUNCE_MS = 300;

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
export function SearchField({ value, onChange, placeholder, clearLabel }: SearchFieldProps) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = (next: string, immediate = false) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    if (immediate) onChange(next);
    else timer.current = setTimeout(() => onChange(next), SEARCH_DEBOUNCE_MS);
  };

  return (
    <div className="relative w-full sm:max-w-xs">
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
