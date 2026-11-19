"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookmarkIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

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
import { getNavIcon } from "@/features/navigation/lib/nav-icons";
import {
  containsLeaf,
  filterNavigation,
  findActiveLeaf,
  nodeHref,
} from "@/features/navigation/lib/navigation-utils";
import { useNavigation, useNavigationBadges } from "@/features/navigation/queries";
import type { NavBadges, NavGroupNode, NavLeafNode, NavNode } from "@/features/navigation/types";
import { useFormat } from "@/i18n/use-format";
import type { Tone } from "@/lib/api/types";
import { resourceHref } from "@/lib/routes";

import { SidebarNavSkeleton } from "./sidebar-nav-skeleton";

// Coral marker on the leading edge of the active entry.
const activeMarkerClass =
  "relative data-active:before:absolute data-active:before:inset-y-2 data-active:before:left-0 data-active:before:w-0.5 data-active:before:rounded-full data-active:before:bg-brand";

const badgeClass = "rounded-sm px-1.5 font-mono text-[0.625rem] tabular-nums";

const BADGE_TONE: Record<Tone, string> = {
  neutral: "bg-sidebar-accent text-sidebar-accent-foreground",
  info: "bg-tone-info/20 text-sidebar-accent-foreground",
  success: "bg-tone-success/20 text-sidebar-accent-foreground",
  warning: "bg-tone-warning/25 text-sidebar-accent-foreground",
  danger: "bg-tone-danger/25 text-sidebar-accent-foreground",
};

interface SidebarNavProps {
  /** Text typed in the menu search. Empty shows the full menu. */
  query: string;
}

/**
 * The sidebar menu, rendered from `GET /navigation`: groups to any depth, resource views
 * and fixed pages. The tree is already filtered by the backend to what the admin may see.
 */
export function SidebarNav({ query }: SidebarNavProps) {
  const { data: navigation, isPending, isError, refetch } = useNavigation();
  const { data: badges } = useNavigationBadges(navigation !== undefined);
  const pathname = usePathname();
  const activeSavedView = useSearchParams().get("saved");
  const t = useTranslations("shell");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const { isMobile, state, setOpen, setOpenMobile } = useSidebar();
  // Sections the admin opened or closed by hand. Until touched, a section is open when it
  // contains the current page.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  if (isPending) return <SidebarNavSkeleton />;

  if (isError) {
    return (
      <div className="px-4 py-6 text-sm group-data-[collapsible=icon]:hidden">
        <p>{t("menuLoadFailed")}</p>
        <button type="button" onClick={() => refetch()} className="mt-1 underline underline-offset-4">
          {tCommon("tryAgain")}
        </button>
      </div>
    );
  }

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery !== "";
  const nodes = filterNavigation(navigation, trimmedQuery);
  const activeKey = findActiveLeaf(navigation, pathname)?.key;
  const isCollapsed = state === "collapsed" && !isMobile;
  const closeMobileMenu = () => {
    if (isMobile) setOpenMobile(false);
  };

  if (navigation.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
        {t("menuEmpty")}
      </p>
    );
  }

  if (nodes.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
        {t.rich("menuNoMatches", {
          query: trimmedQuery,
          term: (chunks) => <span className="text-sidebar-accent-foreground">{chunks}</span>,
        })}
      </p>
    );
  }

  const badgeOf = (leaf: NavLeafNode, counts: NavBadges | undefined) => {
    if (leaf.type !== "view" || !leaf.badge) return null;
    const entry = counts?.[leaf.key];
    if (!entry || entry.count === 0) return null;
    return {
      text: entry.capped ? t("badgeCapped", { count: format.number(entry.count) }) : format.number(entry.count),
      className: cn(badgeClass, BADGE_TONE[leaf.badge.tone] ?? BADGE_TONE.neutral),
    };
  };

  const savedViewLinks = (leaf: NavLeafNode) => {
    if (leaf.type !== "view" || !leaf.saved_views?.length) return null;
    return leaf.saved_views.map((view) => (
      <SidebarMenuSubItem key={`${leaf.key}-saved-${view.id}`}>
        <SidebarMenuSubButton
          render={
            <Link href={resourceHref(leaf.resource, leaf.view, { savedView: view.id })} onClick={closeMobileMenu} />
          }
          isActive={leaf.key === activeKey && activeSavedView === String(view.id)}
          className="data-active:font-medium"
        >
          <BookmarkIcon className="size-3.5 opacity-60" />
          <span>
            <Highlight text={view.name} query={trimmedQuery} />
          </span>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    ));
  };

  /** A view or page at the first level of a section. */
  const renderLeaf = (leaf: NavLeafNode) => {
    const Icon = getNavIcon(leaf.icon);
    const badge = badgeOf(leaf, badges);
    const saved = savedViewLinks(leaf);
    return (
      <SidebarMenuItem key={leaf.key}>
        <SidebarMenuButton
          render={<Link href={nodeHref(leaf)} onClick={closeMobileMenu} />}
          isActive={leaf.key === activeKey && !activeSavedView}
          tooltip={leaf.label}
          className={activeMarkerClass}
        >
          <Icon />
          <span>
            <Highlight text={leaf.label} query={trimmedQuery} />
          </span>
        </SidebarMenuButton>
        {badge ? <SidebarMenuBadge className={badge.className}>{badge.text}</SidebarMenuBadge> : null}
        {saved ? <SidebarMenuSub>{saved}</SidebarMenuSub> : null}
      </SidebarMenuItem>
    );
  };

  /** Everything inside an open section. Deeper groups become a small heading with their entries. */
  const renderSubNodes = (children: NavNode[]) =>
    children.map((child) => {
      if (child.type === "group") {
        return (
          <li key={child.key} className="contents">
            <ul className="contents">
              <li className="px-2 pt-2 pb-0.5 font-mono text-[0.625rem] tracking-wider text-sidebar-foreground/50 uppercase">
                <Highlight text={child.label} query={trimmedQuery} />
              </li>
              {renderSubNodes(child.children)}
            </ul>
          </li>
        );
      }
      const badge = badgeOf(child, badges);
      return [
        <SidebarMenuSubItem key={child.key}>
          <SidebarMenuSubButton
            render={<Link href={nodeHref(child)} onClick={closeMobileMenu} />}
            isActive={child.key === activeKey && !activeSavedView}
            className="data-active:font-medium"
          >
            <span>
              <Highlight text={child.label} query={trimmedQuery} />
            </span>
            {badge ? <span className={cn("ml-auto", badge.className)}>{badge.text}</span> : null}
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>,
        savedViewLinks(child),
      ];
    });

  /** A group inside a section: a collapsible entry. */
  const renderGroup = (group: NavGroupNode) => {
    const Icon = getNavIcon(group.icon);
    const containsCurrentPage = containsLeaf(group, activeKey);
    const isOpen = isSearching || (toggled[group.key] ?? containsCurrentPage);

    return (
      <Collapsible
        key={group.key}
        open={isOpen}
        onOpenChange={(open) => setToggled((current) => ({ ...current, [group.key]: open }))}
        render={<SidebarMenuItem />}
      >
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              tooltip={group.label}
              // Collapsed to icons, a section cannot show its children: mark it instead.
              isActive={isCollapsed && containsCurrentPage}
              className={activeMarkerClass}
              onClick={() => {
                if (!isCollapsed) return;
                // Expand the sidebar so the section's entries become reachable.
                setOpen(true);
                setToggled((current) => ({ ...current, [group.key]: false }));
              }}
            />
          }
        >
          <Icon />
          <span>
            <Highlight text={group.label} query={trimmedQuery} />
          </span>
          <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden in-data-panel-open:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>{renderSubNodes(group.children)}</SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderEntries = (children: NavNode[]) =>
    children.map((child) => (child.type === "group" ? renderGroup(child) : renderLeaf(child)));

  // Entries outside any section (none today) are shown first, without a heading.
  const looseLeaves = nodes.filter((node): node is NavLeafNode => node.type !== "group");
  const sections = nodes.filter((node): node is NavGroupNode => node.type === "group");

  return (
    <>
      {looseLeaves.length > 0 ? (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{looseLeaves.map(renderLeaf)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}
      {sections.map((section) => (
        <SidebarGroup key={section.key}>
          <SidebarGroupLabel className="font-mono text-[0.625rem] tracking-[0.14em] text-sidebar-foreground/55 uppercase">
            {section.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderEntries(section.children)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
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
