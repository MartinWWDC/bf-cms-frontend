import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/features/session/components/auth-gate";

/** Every signed-in screen renders inside the app shell. Login lives outside this group. */
export default function CmsLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
