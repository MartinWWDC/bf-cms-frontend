import type { Metadata } from "next";

import { SessionsScreen } from "@/features/session/components/sessions-screen";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  return <SessionsScreen />;
}
