import { z } from "zod";

export const checkoutSchema = z.object({
  shippingAddress: z.string().min(5, "Shipping address is required"),
  phone: z.string().min(8, "Contact phone is required"),
  paymentProvider: z.enum(["PAYSTACK", "FLUTTERWAVE", "MOCK"]).default("MOCK"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
