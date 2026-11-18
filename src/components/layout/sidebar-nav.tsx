"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getNavIcon } from "@/features/navigation/nav-icons";
import { filterNavigation, isHrefActive, isItemActive } from "@/features/navigation/navigation-utils";
import { useNavigation } from "@/features/navigation/queries";
import type { NavItem } from "@/features/navigation/types";

import { SidebarNavSkeleton } from "./sidebar-nav-skeleton";

// Coral marker on the leading edge of the active entry.
const activeMarkerClass =
  "relative data-active:before:absolute data-active:before:inset-y-2 data-active:before:left-0 data-active:before:w-0.5 data-active:before:rounded-full data-active:before:bg-brand";

const badgeClass =
  "rounded-sm bg-sidebar-accent px-1.5 font-mono text-[0.625rem] text-sidebar-accent-foreground";

interface SidebarNavProps {
  /** Text typed in the menu search. Empty shows the full menu. */
  query: string;
}

/**
 * The sidebar menu, rendered from navigation data (groups → items → sub-items).
 * Adding, removing or reordering entries is a data change; this component does not change.
 */
export function SidebarNav({ query }: SidebarNavProps) {
  const { data: navigation, isPending, isError, refetch } = useNavigation();
  const pathname = usePathname();
  const { isMobile, state, setOpen, setOpenMobile } = useSidebar();
  // Sections the admin opened or closed by hand. Until touched, a section is open when it
  // contains the current page.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  if (isPending) {
    return <SidebarNavSkeleton />;
  }

  if (isError) {
    return (
      <div className="px-4 py-6 text-sm group-data-[collapsible=icon]:hidden">
        <p>The menu could not be loaded.</p>
        <button type="button" onClick={() => refetch()} className="mt-1 underline underline-offset-4">
          Try again
        </button>
      </div>
    );
  }

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery !== "";
  const groups = filterNavigation(navigation, trimmedQuery);
  const isCollapsed = state === "collapsed" && !isMobile;
  const closeMobileMenu = () => {
    if (isMobile) setOpenMobile(false);
  };

  if (groups.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
        Nothing in the menu matches <span className="text-sidebar-accent-foreground">“{trimmedQuery}”</span>.
      </p>
    );
  }

  const renderItem = (item: NavItem) => {
    const Icon = getNavIcon(item.icon);

    if (!item.children?.length) {
      return (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            render={<Link href={item.href ?? "#"} onClick={closeMobileMenu} />}
            isActive={isHrefActive(item.href, pathname)}
            tooltip={item.label}
            className={activeMarkerClass}
          >
            <Icon />
            <span>
              <Highlight text={item.label} query={trimmedQuery} />
            </span>
          </SidebarMenuButton>
          {item.badge ? <SidebarMenuBadge className={badgeClass}>{item.badge}</SidebarMenuBadge> : null}
        </SidebarMenuItem>
      );
    }

    const containsCurrentPage = isItemActive(item, pathname);
    const isOpen = isSearching || (toggled[item.id] ?? containsCurrentPage);

    return (
      <Collapsible
        key={item.id}
        open={isOpen}
        onOpenChange={(open) => setToggled((current) => ({ ...current, [item.id]: open }))}
        render={<SidebarMenuItem />}
      >
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              tooltip={item.label}
              // Collapsed to icons, a section cannot show its children: mark it instead.
              isActive={isCollapsed && containsCurrentPage}
              className={activeMarkerClass}
              onClick={() => {
                if (!isCollapsed) return;
                // Expand the sidebar so the section's entries become reachable.
                setOpen(true);
                setToggled((current) => ({ ...current, [item.id]: false }));
              }}
            />
          }
        >
          <Icon />
          <span>
            <Highlight text={item.label} query={trimmedQuery} />
          </span>
          <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden in-data-panel-open:rotate-90" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.id}>
                <SidebarMenuSubButton
                  render={<Link href={child.href ?? "#"} onClick={closeMobileMenu} />}
                  isActive={isHrefActive(child.href, pathname)}
                  className="data-active:font-medium"
                >
                  <span>
                    <Highlight text={child.label} query={trimmedQuery} />
                  </span>
                  {child.badge ? <span className={`ml-auto ${badgeClass}`}>{child.badge}</span> : null}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return groups.map((group) => (
    <SidebarGroup key={group.id}>
      <SidebarGroupLabel className="font-mono text-[0.625rem] tracking-[0.14em] text-sidebar-foreground/55 uppercase">
        {group.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>{group.items.map(renderItem)}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}

/** Marks the part of a label that matches the menu search. */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-semibold text-brand">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}
