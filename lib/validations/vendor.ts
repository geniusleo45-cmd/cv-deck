import { z } from "zod";

export const vendorUpdateSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  officeAddress: z.string().min(5, "Office address is required"),
  phone: z.string().optional(),
  businessRegNumber: z.string().optional(),
  bankDetails: z.string().optional(),
  logo: z.string().url().optional().or(z.literal("")),
  banner: z.string().url().optional().or(z.literal("")),
});

export const verificationSubmitSchema = z.object({
  documentType: z.string().min(2, "Document type is required (e.g., CAC, Govt ID, Utility Bill)"),
  documentUrl: z.string().refine(
    (value) => value.startsWith("data:application/pdf") || value.startsWith("data:image/"),
    "Upload a valid PDF or image document",
  ),
});

export const adminVerifyVendorSchema = z.object({
  vendorId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNotes: z.string().optional(),
});

export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;
export type VerificationSubmitInput = z.infer<typeof verificationSubmitSchema>;
export type AdminVerifyVendorInput = z.infer<typeof adminVerifyVendorSchema>;
