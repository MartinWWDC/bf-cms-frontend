import Link from "next/link";
import { cn } from "cn";

/** Two wheels: the BikeFlip mark. */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" fill="none" aria-hidden className={className}>
      <circle cx="8" cy="12" r="6.5" stroke="currentColor" strokeWidth="2.25" />
      <circle cx="20" cy="12" r="6.5" stroke="var(--brand)" strokeWidth="2.25" />
      <path d="M8 12 13.5 3.5H18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 rounded-md text-sidebar-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className,
      )}
    >
      <BrandMark className="h-5 w-7 shrink-0" />
      <span className="font-heading text-[1.0625rem] leading-none font-semibold tracking-tight">
        BikeFlip
      </span>
      <span className="rounded-sm border border-sidebar-border px-1.5 py-0.5 font-mono text-[0.625rem] leading-none font-medium tracking-widest text-sidebar-foreground">
        CMS
      </span>
    </Link>
  );
}
