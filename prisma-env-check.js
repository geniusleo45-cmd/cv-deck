require("dotenv").config();

console.log("DATABASE_URL =", process.env.DATABASE_URL);
console.log("DIRECT_URL =", process.env.DIRECT_URL);

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`SELECT version()`;
  console.log(result);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });