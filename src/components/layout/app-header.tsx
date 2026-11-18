"use client";

import { PanelLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";

const frameButtonClass =
  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent";

/**
 * Top bar of the ink frame. Deliberately simple: menu toggle, brand, theme.
 * The signed-in admin lives at the bottom of the sidebar.
 */
export function AppHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 bg-sidebar px-3 text-sidebar-foreground">
      <Button
        variant="ghost"
        size="icon"
        className={frameButtonClass}
        aria-label="Toggle menu"
        onClick={toggleSidebar}
      >
        <PanelLeftIcon />
      </Button>

      <Brand className="px-1 py-1" />

      <div className="ml-auto flex items-center gap-1">
        <span className="mr-1 hidden items-center gap-1.5 rounded-sm border border-sidebar-border px-2 py-1 font-mono text-[0.625rem] tracking-widest uppercase sm:flex">
          <span aria-hidden className="size-1.5 rounded-full bg-tone-warning" />
          Mock data
        </span>
        <ThemeToggle className={frameButtonClass} />
      </div>
    </header>
  );
}
