require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["query", "error"],
});

async function main() {
  const result = await prisma.$queryRaw`SELECT NOW()`;
  console.log(result);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });