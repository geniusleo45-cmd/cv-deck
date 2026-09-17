import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be greater than 0"),
  compareAtPrice: z.number().positive().optional(),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  categoryId: z.string().min(1, "Category is required"),
  status: z.enum(["ACTIVE", "INACTIVE", "SOLD_OUT"]).default("ACTIVE"),
  condition: z.enum(["NEW", "REFURBISHED", "USED"]).default("NEW"),
  locationZone: z.string().default("Computer Village Ikeja"),
  images: z.array(z.string().url("Invalid image URL")).default([]),
  specs: z.record(z.string(), z.string()).default({}),
});

export const productQuerySchema = z.object({
  query: z.string().optional(),
  categoryId: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  condition: z.enum(["NEW", "REFURBISHED", "USED"]).optional(),
  locationZone: z.string().optional(),
  vendorId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(48).default(12),
}).refine(
  (values) =>
    values.minPrice === undefined ||
    values.maxPrice === undefined ||
    values.minPrice <= values.maxPrice,
  { message: "Minimum price cannot be greater than maximum price" },
);

export type ProductInput = z.infer<typeof productSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
