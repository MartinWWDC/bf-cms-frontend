"use client";

import { PanelLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { AssistantButton } from "@/features/assistant/components/assistant-button";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { GlobalSearch } from "@/features/search/components/global-search";

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
  const t = useTranslations("shell");

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 bg-sidebar px-3 text-sidebar-foreground">
      <Button
        variant="ghost"
        size="icon"
        className={frameButtonClass}
        aria-label={t("toggleMenu")}
        onClick={toggleSidebar}
      >
        <PanelLeftIcon />
      </Button>

      <Brand className="px-1 py-1" />

      <div className="ml-auto flex items-center gap-1">
        <GlobalSearch className={frameButtonClass} />
        <AssistantButton className={frameButtonClass} />
        <NotificationBell className={frameButtonClass} />
        <ThemeToggle className={frameButtonClass} />
      </div>
    </header>
  );
}
