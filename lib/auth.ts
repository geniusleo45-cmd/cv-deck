import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations/auth";
import { authClientAddress, AuthRateLimitError, consumeAuthLimit } from "@/lib/authRateLimit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials, request) {
        try {
          await consumeAuthLimit("login-ip", authClientAddress(request?.headers));
        } catch (error) {
          throw new Error(error instanceof AuthRateLimitError ? "TooManyAttempts" : "SignInUnavailable");
        }
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        try {
          await consumeAuthLimit("login-email", parsed.data.email);
        } catch (error) {
          throw new Error(error instanceof AuthRateLimitError ? "TooManyAttempts" : "SignInUnavailable");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: parsed.data.email,
          },
          include: {
            vendorProfile: true,
            recruiterProfile: true,
          },
        });

        if (!user) {
          return null;
        }

        const validPassword = await bcrypt.compare(
          parsed.data.password,
          user.password
        );

        if (!validPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role,
          sessionVersion: user.sessionVersion,
          vendorId: user.vendorProfile?.id,
          recruiterId: user.recruiterProfile?.id,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.vendorId = user.vendorId;
        token.recruiterId = user.recruiterId;
        token.picture = user.image;
        token.sessionVersion = user.sessionVersion ?? 0;
      }

      if (token.id) {
        const account = await prisma.user.findUnique({ where: { id: token.id as string }, select: { sessionVersion: true } });
        if (!account || account.sessionVersion !== (token.sessionVersion ?? 0)) throw new Error("Session revoked. Please sign in again.");
      }

      if (trigger === "update" && session?.image) token.picture = session.image;

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.vendorId = token.vendorId as string | undefined;
        session.user.recruiterId = token.recruiterId as string | undefined;
        session.user.image = token.picture as string | undefined;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  // NextAuth refuses production authentication when this secret is missing.
  // Never substitute a public or predictable fallback.
  secret: process.env.NEXTAUTH_SECRET,
};
