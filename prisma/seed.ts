import { PrismaClient, UserRole, VendorStatus, ProductStatus, ProductCondition } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CV Deck database...");

  // Password hash for all demo accounts: "Password123!"
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // 1. Seed Categories
  const categoriesData = [
    { name: "Laptops & MacBooks", slug: "laptops-macbooks", description: "Laptops, MacBooks, and Workstations", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80" },
    { name: "Mobile Phones & Tablets", slug: "mobile-phones", description: "Smartphones, iPhones, iPads & Android Tablets", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80" },
    { name: "Accessories & Peripherals", slug: "accessories", description: "Keyboards, Mice, Monitors, Cables & Chargers", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80" },
    { name: "Networking & Servers", slug: "networking-servers", description: "Routers, Switches, Server Racks & Fiber Cables", image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80" },
    { name: "Desktops & All-In-Ones", slug: "desktops", description: "Gaming Rigs, Office PCs, iMacs & Custom Builds", image: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=600&q=80" },
    { name: "Repairs & Tech Services", slug: "repairs-services", description: "Hardware Repair, Component Replacement & Diagnostics", image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80" },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
  console.log("Categories seeded!");

  // 2. Seed Users & Profiles
  // Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@cvdeck.ng" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@cvdeck.ng",
      password: hashedPassword,
      phone: "+2348012345678",
      role: UserRole.ADMIN,
      bio: "Computer Village Marketplace Administrator",
    },
  });

  // Vendor User & Profile
  const vendorUser = await prisma.user.upsert({
    where: { email: "vendor@peppletech.ng" },
    update: {},
    create: {
      name: "Chidi Pepple",
      email: "vendor@peppletech.ng",
      password: hashedPassword,
      phone: "+2348098765432",
      role: UserRole.VENDOR,
      bio: "Direct importer of UK & US Used MacBooks and Laptops in Computer Village",
      vendorProfile: {
        create: {
          businessName: "Pepple Street Tech Hub",
          officeAddress: "Suite 12, Pepple Street, Computer Village, Ikeja, Lagos",
          phone: "+2348098765432",
          businessRegNumber: "RC-389102",
          status: VendorStatus.VERIFIED,
          rating: 4.8,
          totalSales: 142,
          verifiedAt: new Date(),
        },
      },
    },
    include: { vendorProfile: true },
  });

  // Second Vendor (Pending verification for admin testing)
  const pendingVendorUser = await prisma.user.upsert({
    where: { email: "otigbagear@cvdeck.ng" },
    update: {},
    create: {
      name: "Amina Otigba",
      email: "otigbagear@cvdeck.ng",
      password: hashedPassword,
      phone: "+2348022223333",
      role: UserRole.VENDOR,
      bio: "Networking hardware and server racks specialist",
      vendorProfile: {
        create: {
          businessName: "Otigba Networking Supplies",
          officeAddress: "Block B, Otigba Street, Computer Village, Ikeja",
          phone: "+2348022223333",
          status: VendorStatus.PENDING,
        },
      },
    },
    include: { vendorProfile: true },
  });

  // Recruiter User & Profile
  const recruiterUser = await prisma.user.upsert({
    where: { email: "recruiter@techhub.ng" },
    update: {},
    create: {
      name: "Sarah Jenkins",
      email: "recruiter@techhub.ng",
      password: hashedPassword,
      phone: "+2348144445555",
      role: UserRole.RECRUITER,
      bio: "Tech Procurement Specialist sourcing hardware & technicians for enterprise clients",
      recruiterProfile: {
        create: {
          companyName: "Nexus Enterprise Solutions",
          industry: "Information Technology",
          website: "https://nexus-solutions.ng",
          phone: "+2348144445555",
          verified: true,
        },
      },
    },
    include: { recruiterProfile: true },
  });

  // Customer User
  const customerUser = await prisma.user.upsert({
    where: { email: "customer@gmail.com" },
    update: {},
    create: {
      name: "Bayo Adebayo",
      email: "customer@gmail.com",
      password: hashedPassword,
      phone: "+2347033334444",
      role: UserRole.CUSTOMER,
      bio: "Tech enthusiast looking for clean refurbished gadgets",
    },
  });

  console.log("Users and Profiles seeded!");

  // 3. Seed Products
  const categories = await prisma.category.findMany();
  const laptopCat = categories.find((c) => c.slug === "laptops-macbooks");
  const phoneCat = categories.find((c) => c.slug === "mobile-phones");
  const networkCat = categories.find((c) => c.slug === "networking-servers");

  if (vendorUser.vendorProfile && laptopCat && phoneCat && networkCat) {
    const productsData = [
      {
        name: "Apple MacBook Pro 16\" M2 Max (32GB / 1TB)",
        slug: "macbook-pro-16-m2-max",
        description: "UK Used Apple MacBook Pro 16-inch M2 Max with 32GB Unified Memory and 1TB SSD. Pristine condition with original charger. Tested and verified at Computer Village.",
        price: 2450000,
        compareAtPrice: 2700000,
        stock: 5,
        status: ProductStatus.ACTIVE,
        condition: ProductCondition.REFURBISHED,
        locationZone: "Pepple Street, Ikeja",
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80",
        ]),
        specs: JSON.stringify({ Processor: "Apple M2 Max", RAM: "32GB", Storage: "1TB SSD", Screen: "16.2-inch Liquid Retina XDR" }),
        vendorId: vendorUser.vendorProfile.id,
        categoryId: laptopCat.id,
      },
      {
        name: "Dell XPS 15 9520 Intel Core i9 (32GB / 1TB RTX 3050 Ti)",
        slug: "dell-xps-15-9520-i9",
        description: "Brand new sealed Dell XPS 15 OLED Touch display, Intel Core i9 12th Gen, 32GB RAM, 1TB NVMe SSD, Dedicated Nvidia RTX Graphics. 1 Year Store Warranty.",
        price: 1980000,
        compareAtPrice: 2150000,
        stock: 3,
        status: ProductStatus.ACTIVE,
        condition: ProductCondition.NEW,
        locationZone: "Otigba Street, Ikeja",
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80",
        ]),
        specs: JSON.stringify({ Processor: "Intel Core i9-12900H", RAM: "32GB DDR5", Storage: "1TB SSD", Graphics: "RTX 3050 Ti" }),
        vendorId: vendorUser.vendorProfile.id,
        categoryId: laptopCat.id,
      },
      {
        name: "iPhone 15 Pro Max 256GB Natural Titanium",
        slug: "iphone-15-pro-max-256gb",
        description: "Brand New Factory Unlocked iPhone 15 Pro Max Natural Titanium. Physical SIM + eSIM. International Warranty active upon setup.",
        price: 1650000,
        compareAtPrice: 1750000,
        stock: 8,
        status: ProductStatus.ACTIVE,
        condition: ProductCondition.NEW,
        locationZone: "Medical Road, Ikeja",
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80",
        ]),
        specs: JSON.stringify({ Display: "6.7-inch Super Retina XDR", Storage: "256GB", Camera: "48MP Main", Battery: "100% Health" }),
        vendorId: vendorUser.vendorProfile.id,
        categoryId: phoneCat.id,
      },
      {
        name: "Cisco Catalyst 3850 48-Port PoE+ Switch",
        slug: "cisco-catalyst-3850-48p",
        description: "Enterprise grade Cisco 48-port Managed Gigabit PoE Switch. Fully tested with console output log included. Ideal for corporate office deployment.",
        price: 850000,
        compareAtPrice: 950000,
        stock: 4,
        status: ProductStatus.ACTIVE,
        condition: ProductCondition.REFURBISHED,
        locationZone: "Otigba Street, Ikeja",
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80",
        ]),
        specs: JSON.stringify({ Ports: "48 x Gigabit Ethernet PoE+", SwitchingCapacity: "176 Gbps", RackUnit: "1U" }),
        vendorId: vendorUser.vendorProfile.id,
        categoryId: networkCat.id,
      },
    ];

    for (const prod of productsData) {
      await prisma.product.create({
        data: prod,
      });
    }
    console.log("Products seeded!");
  }

  // 4. Seed Verification Request
  if (pendingVendorUser.vendorProfile) {
    await prisma.vendorVerification.create({
      data: {
        vendorId: pendingVendorUser.vendorProfile.id,
        documentType: "CAC Business Registration & Govt ID",
        documentUrl: "https://cvdeck.ng/docs/verification_sample.pdf",
        status: "PENDING",
        adminNotes: "Submitted for Computer Village physical shop verification",
      },
    });
    console.log("Vendor Verification sample seeded!");
  }

  console.log("Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
