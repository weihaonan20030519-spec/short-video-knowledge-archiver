import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  headerTestId?: string;
}

export function SectionCard({ title, action, children, headerTestId }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-subtle">
      <div
        className="mb-4 flex flex-wrap items-start gap-3"
        data-testid={headerTestId}
      >
        <h3 className="min-w-0 flex-[1_1_10rem] break-words text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          {title}
        </h3>
        {action ? <div className="min-w-0 flex-[1_1_14rem]">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
