import "dotenv/config";
import prisma from "./config/prisma.js";

try {
  await prisma.$connect();

  console.log("✅ PostgreSQL connected successfully");

  const result = await prisma.$queryRaw`SELECT NOW()`;

  console.log("Database time:", result);

  await prisma.$disconnect();
} catch (error) {
  console.error("❌ Database connection failed:");
  console.error(error);

  await prisma.$disconnect();

  process.exit(1);
}