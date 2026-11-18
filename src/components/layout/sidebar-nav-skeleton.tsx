import { SidebarGroup, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

// Fixed widths: random ones would differ between the prerender and the browser.
const WIDTHS = ["62%", "48%", "74%", "56%", "68%", "44%", "80%", "58%", "66%"];

/** Loading placeholder for the sidebar menu. */
export function SidebarNavSkeleton() {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {WIDTHS.map((width, index) => (
          <SidebarMenuItem key={index} className="flex h-8 items-center gap-2 px-2">
            <Skeleton className="size-4 shrink-0 rounded-sm bg-sidebar-accent" />
            <Skeleton
              className="h-3.5 bg-sidebar-accent group-data-[collapsible=icon]:hidden"
              style={{ width }}
            />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
