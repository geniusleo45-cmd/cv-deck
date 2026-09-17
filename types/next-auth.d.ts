import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      vendorId?: string;
      recruiterId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    vendorId?: string;
    recruiterId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    vendorId?: string;
    recruiterId?: string;
  }
}