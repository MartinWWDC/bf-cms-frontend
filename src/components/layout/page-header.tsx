import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right side: counters or primary buttons. */
  children?: ReactNode;
}

/** Title block at the top of every screen in the content sheet. */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-5 pb-3 sm:px-6 sm:pt-7">
      <div className="min-w-0">
        <h1 className="font-heading text-3xl leading-none font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}
