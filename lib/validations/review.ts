import { z } from "zod";

export const reviewSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().min(3, "Comment must be at least 3 characters").max(1000, "Comment too long"),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
