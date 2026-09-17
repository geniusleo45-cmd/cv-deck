import { z } from "zod";

export const sendMessageSchema = z.object({
  receiverId: z.string().min(1, "Recipient ID is required"),
  content: z.string().min(1, "Message content cannot be empty").max(2000, "Message too long"),
  subject: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
