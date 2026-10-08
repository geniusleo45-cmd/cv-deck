export const premiumPackages = {
  DAILY: { label: "Daily", amount: 420, durationDays: 1, description: "A one-day visibility boost for a timely offer." },
  WEEKLY: { label: "Weekly", amount: 1750, durationDays: 7, description: "A full week of stronger marketplace visibility." },
  MONTHLY: { label: "Monthly", amount: 3600, durationDays: 30, description: "The best value for ongoing promotion." },
} as const;

export type PremiumPackage = keyof typeof premiumPackages;
