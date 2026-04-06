import { z } from "zod";

export const createRecordSchema = z.object({
  inputMethod: z.enum(["upload", "link", "text", "manual"]),
  title: z.string().trim().optional(),
  originalUrl: z.string().trim().optional(),
  content: z.string().optional(),
  folderId: z.string().nullable(),
  tagsText: z.string().optional()
});

export type CreateRecordValues = z.infer<typeof createRecordSchema>;
