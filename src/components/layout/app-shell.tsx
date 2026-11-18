import type { CSSProperties, ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

const shellVariables = {
  "--header-height": "3.25rem",
  "--sidebar-width": "17rem",
} as CSSProperties;

/**
 * The signed-in layout: an ink frame (header on top, sidebar on the left) around a paper
 * content sheet. The frame never scrolls; each page scrolls inside the sheet.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="h-svh flex-col overflow-hidden bg-sidebar" style={shellVariables}>
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <SidebarInset className="scrollbar-slim min-h-0 min-w-0 overflow-y-auto md:rounded-tl-xl">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
