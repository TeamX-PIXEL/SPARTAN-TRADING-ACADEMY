import z from "zod";

export const participantSchema = z.object({
  user_id: z.number(),
  user_name: z.string(),
  email: z.string(),
  waitlist_batch_id: z.number(),
  created_at: z.string(),
});

export type ParticipantRow = z.infer<typeof participantSchema>;
