"use client";

import { useMemo } from "react";
import { cn } from "cn";

import { sanitizeHtml } from "@/lib/sanitize-html";

/** Staff- or user-written HTML, sanitised again before it is shown. */
export function RichText({ html, className }: { html: string; className?: string }) {
  const safe = useMemo(() => sanitizeHtml(html), [html]);

  return (
    <div
      className={cn(
        "max-w-none text-sm leading-relaxed break-words [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_img]:max-h-64 [&_img]:rounded-md [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
      // Sanitised by `sanitizeHtml` above.
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
