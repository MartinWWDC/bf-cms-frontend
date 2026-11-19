import { Suspense } from "react";
import type { Metadata } from "next";

import { AssistantScreen } from "@/features/assistant/components/assistant-screen";

export const metadata: Metadata = { title: "Assistant" };

export default function AssistantPage() {
  return (
    // The open conversation and the page context are read from the URL, which is only known in the browser.
    <Suspense fallback={null}>
      <AssistantScreen />
    </Suspense>
  );
}
