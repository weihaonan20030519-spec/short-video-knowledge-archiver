import type { ReactNode } from "react";

interface CreateRecordResponsiveLayoutProps {
  modeSwitcher: ReactNode;
  modeHint: ReactNode;
  modeSection: ReactNode;
  primaryFields: ReactNode;
  secondaryFields: ReactNode;
}

export function CreateRecordResponsiveLayout({
  modeSwitcher,
  modeHint,
  modeSection,
  primaryFields,
  secondaryFields
}: CreateRecordResponsiveLayoutProps) {
  return (
    <div className="space-y-5">
      {modeSwitcher}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.8fr)] lg:items-start">
        <div className="space-y-5">
          {modeHint}
          {modeSection}
          {primaryFields}
        </div>
        <div className="space-y-5">{secondaryFields}</div>
      </div>
    </div>
  );
}
