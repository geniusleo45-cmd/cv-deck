import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

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
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Failed to create user account" }, { status: 500 });
  }
}