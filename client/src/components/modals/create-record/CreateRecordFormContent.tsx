import type { ReactNode } from "react";

import { CreateRecordResponsiveLayout } from "./CreateRecordResponsiveLayout";

interface CreateRecordFormContentProps {
  modeSwitcher: ReactNode;
  modeHint: ReactNode;
  modeSection: ReactNode;
  primaryFields: ReactNode;
  secondaryFields: ReactNode;
}

export function CreateRecordFormContent(props: CreateRecordFormContentProps) {
  return <CreateRecordResponsiveLayout {...props} />;
}
