"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import { SidebarNav } from "./sidebar-nav";
import { SidebarNavSkeleton } from "./sidebar-nav-skeleton";
import { UserMenu } from "./user-menu";

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/**
 * Left side of the ink frame: menu search, the navigation, and the signed-in admin.
 *
 * Desktop: collapses to an icon rail (the header button, the rail edge, or Ctrl/Cmd+B).
 * Mobile: opens as a full-height sheet from the header button and closes on navigation.
 * "/" focuses the menu search from anywhere.
 */
export function AppSidebar() {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { isMobile, setOpen, setOpenMobile } = useSidebar();

  const focusSearch = () => {
    if (isMobile) setOpenMobile(true);
    else setOpen(true);
    // Wait for the sidebar to expand / the sheet to mount before focusing.
    requestAnimationFrame(() => requestAnimationFrame(() => searchRef.current?.focus()));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      if (isMobile) setOpenMobile(true);
      else setOpen(true);
      requestAnimationFrame(() => requestAnimationFrame(() => searchRef.current?.focus()));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, setOpen, setOpenMobile]);

  return (
    <Sidebar
      collapsible="icon"
      className="top-(--header-height)! h-[calc(100svh-var(--header-height))]! group-data-[side=left]:border-r-0"
    >
      <SidebarHeader className="pt-3 md:pt-1">
        {/* Expanded: the search field. */}
        <div className="relative group-data-[collapsible=icon]:hidden">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-sidebar-foreground/60" />
          <SidebarInput
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
            }}
            placeholder="Search menu"
            aria-label="Search menu"
            className="h-9 border-sidebar-border bg-sidebar-accent/60 pr-9 pl-8 text-sidebar-accent-foreground placeholder:text-sidebar-foreground/55 dark:bg-sidebar-accent/60 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear menu search"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-sidebar-foreground/70 outline-none hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-2 hidden h-5 -translate-y-1/2 items-center rounded-sm border border-sidebar-border px-1.5 font-mono text-[0.625rem] text-sidebar-foreground/60 md:flex">
              /
            </kbd>
          )}
        </div>

        {/* Collapsed to icons: a button that expands the sidebar and focuses the search. */}
        <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Search menu" onClick={focusSearch}>
              <SearchIcon />
              <span>Search menu</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="scrollbar-slim! overscroll-contain pb-2">
        {/* The menu reads the pathname, which needs a Suspense boundary on dynamic routes. */}
        <Suspense fallback={<SidebarNavSkeleton />}>
          <SidebarNav query={query} />
        </Suspense>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <UserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
