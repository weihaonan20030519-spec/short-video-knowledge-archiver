import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAppI18n } from "../../hooks/useAppI18n";
import { ModalShell } from "../common/ModalShell";

interface ManageCollectionModalProps {
  open: boolean;
  entityLabel: "folder" | "tag";
  mode: "create" | "rename";
  initialName?: string;
  description?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<string | null | void>;
}

export function ManageCollectionModal({
  open,
  entityLabel,
  mode,
  initialName,
  description,
  onClose,
  onSubmit
}: ManageCollectionModalProps) {
  const { t } = useAppI18n();
  const manageCollectionSchema = z.object({
    name: z.string().trim().min(1, t.modals.nameRequired).max(40, t.modals.nameTooLong)
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<z.infer<typeof manageCollectionSchema>>({
    reValidateMode: "onChange",
    resolver: zodResolver(manageCollectionSchema),
    defaultValues: {
      name: initialName || ""
    }
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    reset({ name: initialName || "" });
    setSubmitError(null);
  }, [initialName, open, reset]);

  const title =
    entityLabel === "folder"
      ? mode === "create"
        ? t.modals.manageFolderCreate
        : t.modals.manageFolderRename
      : mode === "create"
        ? t.modals.manageTagCreate
        : t.modals.manageTagRename;
  const entityName = entityLabel === "folder" ? t.modals.folderName : t.modals.tagName;
  const placeholder =
    entityLabel === "folder" ? t.modals.folderNamePlaceholder : t.modals.tagNamePlaceholder;

  return (
    <ModalShell open={open} title={title} description={description} onClose={onClose}>
      <form
        className="space-y-5"
        onSubmit={handleSubmit(async (values) => {
          setSubmitError(null);
          const result = await onSubmit(values.name.trim());
          if (typeof result === "string" && result) {
            setSubmitError(result);
            return;
          }
          reset({ name: "" });
        })}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">{entityName}</span>
          <input
            autoFocus
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
            placeholder={placeholder}
            {...register("name", {
              onChange: () => setSubmitError(null)
            })}
          />
          {errors.name ? <p className="mt-2 text-sm text-rose-600">{errors.name.message}</p> : null}
          {!errors.name && submitError ? <p className="mt-2 text-sm text-rose-600">{submitError}</p> : null}
        </label>

        <div className="flex justify-end gap-3">
          <button
            className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700"
            onClick={onClose}
            type="button"
          >
            {t.common.cancel}
          </button>
          <button
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {mode === "create" ? t.common.create : t.common.save}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
