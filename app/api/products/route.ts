import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { productSchema, productQuerySchema } from "@/lib/validations/product";

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const queryObj = Object.fromEntries(searchParams.entries());
    const validatedQuery = productQuerySchema.parse(queryObj);

    const { query, categoryId, minPrice, maxPrice, condition, locationZone, vendorId, sort, page, limit } = validatedQuery;
    const skip = (page - 1) * limit;

    const where: any = {
      status: "ACTIVE",
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (condition) {
      where.condition = condition;
    }

    if (locationZone) {
      where.locationZone = { contains: locationZone, mode: "insensitive" };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    const orderBy = sort === "PRICE_LOW" ? { price: "asc" as const } : sort === "PRICE_HIGH" ? { price: "desc" as const } : { createdAt: "desc" as const };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          vendor: {
            select: {
              id: true,
              businessName: true,
              officeAddress: true,
              status: true,
              rating: true,
            },
          },
          wishlistItems: currentUser
            ? { where: { userId: currentUser.id }, select: { id: true } }
            : false,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Products GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || (sessionUser.role !== "VENDOR" && sessionUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only vendors can create product listings" }, { status: 403 });
    }

    let vendorId = sessionUser.vendorId;
    if (!vendorId) {
      const vendorProfile = await prisma.vendor.findUnique({
        where: { userId: sessionUser.id },
      });
      if (!vendorProfile) {
        return NextResponse.json({ error: "Vendor profile not found" }, { status: 400 });
      }
      vendorId = vendorProfile.id;
    }

    const body = await req.json();
    const validated = productSchema.parse(body);

    const slug = validated.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    const product = await prisma.product.create({
      data: {
        name: validated.name,
        slug: `${slug}-${Date.now().toString(36)}`,
        description: validated.description,
        price: validated.price,
        compareAtPrice: validated.compareAtPrice,
        stock: validated.stock,
        status: validated.status,
        condition: validated.condition,
        locationZone: validated.locationZone,
        images: JSON.stringify(validated.images),
        specs: JSON.stringify(validated.specs),
        vendorId,
        categoryId: validated.categoryId,
      },
      include: {
        category: true,
        vendor: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Product POST Error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
