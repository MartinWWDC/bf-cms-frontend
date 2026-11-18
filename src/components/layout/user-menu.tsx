"use client";

import { ChevronsUpDownIcon, LanguagesIcon, LogOutIcon, MonitorSmartphoneIcon, UserRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/session/queries";
import { isLocale } from "@/i18n/config";
import { useLocaleSwitcher } from "@/i18n/use-locale-switcher";
import { initials } from "@/lib/format";

/** The signed-in admin, with the account menu. Sits in the sidebar footer. */
export function UserMenu() {
  const { data: admin } = useMe();
  const { isMobile } = useSidebar();
  const t = useTranslations("userMenu");
  const tCommon = useTranslations("common");
  const { locale, locales, localeNames, setLocale } = useLocaleSwitcher();

  const notConnected = (label: string) => () => toast.info(tCommon("notConnected", { label }));

  if (!admin) {
    return (
      <div className="flex h-12 items-center gap-2 px-2">
        <Skeleton className="size-8 rounded-full bg-sidebar-accent" />
        <div className="flex flex-1 flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
          <Skeleton className="h-3 w-24 bg-sidebar-accent" />
          <Skeleton className="h-2.5 w-16 bg-sidebar-accent" />
        </div>
      </div>
    );
  }

  const avatar = (
    <Avatar className="after:hidden">
      {admin.avatarUrl ? <AvatarImage src={admin.avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-brand font-mono text-xs font-medium text-brand-foreground">
        {initials(admin.name)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="aria-expanded:bg-sidebar-accent" />}
          >
            {avatar}
            <span className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium text-sidebar-accent-foreground">{admin.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{admin.roles[0] ?? admin.email}</span>
            </span>
            <ChevronsUpDownIcon className="ml-auto opacity-60" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side={isMobile ? "top" : "right"}
            align="end"
            sideOffset={8}
            className="w-60"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2.5 py-1.5">
                {avatar}
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">{admin.name}</span>
                  <span className="truncate text-xs font-normal">{admin.email}</span>
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={notConnected(t("profile"))}>
                <UserRoundIcon />
                {t("profile")}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <LanguagesIcon />
                  {t("language")}
                  <span className="ml-auto font-mono text-xs text-muted-foreground uppercase">{locale}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuRadioGroup
                    value={locale}
                    onValueChange={(value) => {
                      if (isLocale(value)) setLocale(value);
                    }}
                  >
                    {locales.map((code) => (
                      <DropdownMenuRadioItem key={code} value={code}>
                        {localeNames[code]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={notConnected(t("sessions"))}>
                <MonitorSmartphoneIcon />
                {t("sessions")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={notConnected(t("signOut"))}>
                <LogOutIcon />
                {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
