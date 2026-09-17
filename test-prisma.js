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