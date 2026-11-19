"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronsUpDownIcon, ClipboardListIcon, KeyRoundIcon, LanguagesIcon, LogOutIcon, MonitorSmartphoneIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { RecoveryCodesDialog } from "@/features/session/components/recovery-codes-dialog";
import { useLogout, useUpdateLocale } from "@/features/session/mutations";
import { useMe } from "@/features/session/queries";
import { DocsMenuItem } from "@/features/docs/components/docs-menu-item";
import { WarehouseMenuItem } from "@/features/warehouse/components/warehouse-menu-item";
import { isLocale } from "@/i18n/config";
import { useLocaleSwitcher } from "@/i18n/use-locale-switcher";
import { useErrorToast } from "@/lib/api/use-error-message";
import { initials } from "@/lib/format";
import { routes } from "@/lib/routes";

/** The signed-in admin, with the account menu. Sits in the sidebar footer. */
export function UserMenu() {
  const { data: admin } = useMe();
  const { isMobile } = useSidebar();
  const t = useTranslations("userMenu");
  const { locale, locales, localeNames, setLocale } = useLocaleSwitcher();
  const logout = useLogout();
  const updateLocale = useUpdateLocale();
  const toastError = useErrorToast();
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  // The choice is saved on the backend first: from then on it decides the language of
  // every label and message the API returns.
  const changeLocale = (next: (typeof locales)[number]) =>
    updateLocale.mutate(next, { onSuccess: () => setLocale(next), onError: toastError });

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
              <span className="truncate text-xs text-sidebar-foreground/70">{admin.is_super_admin ? t("superAdmin") : (admin.roles[0] ?? admin.email)}</span>
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
                      if (isLocale(value) && value !== locale) changeLocale(value);
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
              <DropdownMenuItem render={<Link href={routes.sessions} />}>
                <MonitorSmartphoneIcon />
                {t("sessions")}
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={routes.jobs} />}>
                <ClipboardListIcon />
                {t("jobs")}
              </DropdownMenuItem>
              <WarehouseMenuItem />
              <DocsMenuItem />
              <DropdownMenuItem onClick={() => setRecoveryOpen(true)}>
                <KeyRoundIcon />
                {t("recoveryCodes")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={logout.isPending} onClick={() => logout.mutate()}>
                <LogOutIcon />
                {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <RecoveryCodesDialog open={recoveryOpen} onOpenChange={setRecoveryOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
