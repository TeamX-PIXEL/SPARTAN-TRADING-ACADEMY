import z from "zod";

export const batchSchema = z.object({
  batchId: z.string(),
  batchName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(["In Progress", "Ongoing", "Finished"]),
  chaptersFinished: z.number(),
  totalChapters: z.number(),
});

export type BatchRow = z.infer<typeof batchSchema>;
