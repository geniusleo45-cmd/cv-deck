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
    sessionVersion?: number;
    role: string;
    vendorId?: string;
    recruiterId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionVersion?: number;
    id?: string;
    role?: string;
    vendorId?: string;
    recruiterId?: string;
  }
}
