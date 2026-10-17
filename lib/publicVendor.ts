// Explicit public allowlist. Never include identity documents, bank details,
// registration numbers, or private account contact fields in marketplace JSON.
export const publicVendorSelect = {
  id: true, businessName: true, officeAddress: true, phone: true,
  logo: true, banner: true, status: true, rating: true, verifiedAt: true,
  user: { select: { id: true, name: true, avatar: true } },
} as const;
