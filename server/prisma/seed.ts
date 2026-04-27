import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const ronPasswordHash = bcrypt.hashSync("babi", 12);
  const briPasswordHash = bcrypt.hashSync("babi", 12);

  // Upsert users
  const ronron = await prisma.user.upsert({
    where: { id: "user_boy" },
    update: {
      username: "ronron",
      displayName: "Ron Ron",
      role: Role.BOY,
      theme: "blue",
      avatar: "/avatars/boy.png",
      passwordHash: ronPasswordHash,
    },
    create: {
      id: "user_boy",
      username: "ronron",
      displayName: "Ron Ron",
      role: Role.BOY,
      theme: "blue",
      avatar: "/avatars/boy.png",
      passwordHash: ronPasswordHash,
    },
  });

  const bribri = await prisma.user.upsert({
    where: { id: "user_girl" },
    update: {
      username: "bribri",
      displayName: "BriBri",
      role: Role.GIRL,
      theme: "yellow",
      avatar: "/avatars/girl.png",
      passwordHash: briPasswordHash,
    },
    create: {
      id: "user_girl",
      username: "bribri",
      displayName: "BriBri",
      role: Role.GIRL,
      theme: "yellow",
      avatar: "/avatars/girl.png",
      passwordHash: briPasswordHash,
    },
  });

  // Upsert relationship start date
  await prisma.relationship.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      startDate: new Date("2025-10-15T00:00:00.000Z"),
    },
  });

  console.log("✅ Seeded users:", ronron.displayName, "&", bribri.displayName);
  console.log("✅ Seeded relationship start date: October 15, 2025");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
