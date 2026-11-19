import { Suspense } from "react";
import type { Metadata } from "next";

import { DocsScreen } from "@/features/docs/components/docs-screen";

export const metadata: Metadata = { title: "API documents" };

export default function DocsPage() {
  return (
    // The open document is read from the URL, which is only known in the browser.
    <Suspense fallback={null}>
      <DocsScreen />
    </Suspense>
  );
}
