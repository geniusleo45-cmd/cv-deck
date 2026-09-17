const { Prisma } = require("@prisma/client");

console.log("Prisma version:", Prisma.prismaVersion);
console.log("Engine type:", process.env.PRISMA_CLIENT_ENGINE_TYPE);