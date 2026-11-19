import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginScreen } from "@/features/session/components/login-screen";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    // The page to return to after login is read from the URL, which is only known in the browser.
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
