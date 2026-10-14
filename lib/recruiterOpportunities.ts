import { z } from "zod";

export function responseVisibility(opportunityId: string, viewerId: string, ownerId: string) {
  return { opportunityId, ...(viewerId === ownerId ? {} : { applicantId: viewerId }) };
}

// Verification comes from current database records, never a form or JWT claim.
export function isVerifiedApplicant(user: {
  role: string;
  vendorProfile?: { status: string } | null;
  recruiterProfile?: { verified: boolean } | null;
} | null) {
  return Boolean(user && (
    (user.role === "VENDOR" && user.vendorProfile?.status === "VERIFIED") ||
    (user.role === "RECRUITER" && user.recruiterProfile?.verified === true)
  ));
}

export const opportunitySchema = z.object({
  kind: z.enum(["JOB", "PROCUREMENT"]),
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(30).max(6000),
  location: z.string().trim().min(2).max(160),
  terms: z.string().trim().max(500).optional(),
  quantity: z.number().int().positive().max(1000000).optional(),
  closesAt: z.iso.datetime().refine((value) => {
    const time = Date.parse(value);
    return time > Date.now() && time < Date.now() + 366 * 86400000;
  }, "Choose a future closing date within one year."),
}).refine((value) => value.kind !== "PROCUREMENT" || value.quantity !== undefined, "Enter the required quantity.");

export const responseSchema = z.object({
  message: z.string().trim().min(30).max(4000),
  quoteAmount: z.number().positive().max(999999999).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, "Use at most two decimal places.").optional(),
});

export const reviewSchema = z.object({
  responseId: z.string().min(1),
  status: z.enum(["SHORTLISTED", "SELECTED", "DECLINED"]),
});
