import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { authClientAddress, AuthRateLimitError, consumeAuthLimit } from "@/lib/authRateLimit";

export async function POST(req: Request) {
  try {
    await consumeAuthLimit("register-ip", authClientAddress(req.headers));
  } catch (error) {
    return limitFailure(error);
  }
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);
    try {
      await consumeAuthLimit("register-email", validated.email);
    } catch (error) {
      return limitFailure(error);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        phone: validated.phone,
        role: validated.role,
        ...(validated.role === "VENDOR" && {
          vendorProfile: {
            create: {
              businessName: validated.businessName || `${validated.name}'s Shop`,
              officeAddress: validated.officeAddress || "Computer Village, Ikeja, Lagos",
              phone: validated.phone,
            },
          },
        }),
        ...(validated.role === "RECRUITER" && {
          recruiterProfile: {
            create: {
              companyName: validated.companyName || `${validated.name} Tech`,
              industry: validated.industry || "Technology",
              phone: validated.phone,
            },
          },
        }),
      },
      include: {
        vendorProfile: true,
        recruiterProfile: true,
      },
    });

    // Create a notification welcoming the new user
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Welcome to CV Deck!",
        message: `Your ${user.role.toLowerCase()} account has been created successfully. Explore Computer Village marketplace!`,
        type: "SYSTEM",
      },
    });

    const { password, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Failed to create user account" }, { status: 500 });
  }
}

function limitFailure(error: unknown) {
  if (error instanceof AuthRateLimitError) return NextResponse.json(
    { error: "Too many registration attempts. Please try again after the cooldown." },
    { status: 429, headers: { "Retry-After": String(error.retryAfter), "Cache-Control": "no-store" } }
  );
  return NextResponse.json({ error: "Registration is temporarily unavailable. Please try again later." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
