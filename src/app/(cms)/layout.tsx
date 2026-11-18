import { AppShell } from "@/components/layout/app-shell";

/** Every signed-in screen renders inside the app shell. Login will live outside this group. */
export default function CmsLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
