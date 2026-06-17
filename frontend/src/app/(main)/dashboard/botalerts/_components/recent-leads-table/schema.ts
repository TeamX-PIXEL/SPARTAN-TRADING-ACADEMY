import z from "zod";

export const tableDataSchema = z.object({
  id: z.string(),
  key: z.string(),
  user: z.string(),
  telegramId: z.string(), // <-- Added this
  model: z.string(),
  expiry: z.string(),
});

export type TableDataRow = z.infer<typeof tableDataSchema>;
