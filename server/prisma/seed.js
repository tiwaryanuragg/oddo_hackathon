import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Bootstraps the first Admin. Signup can only create Employees, so the initial
// Admin must be seeded. Change credentials after first login.
async function main() {
  const email = "admin@assetflow.local";
  const password = "Admin@123";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "Admin", status: "Active" },
    create: { name: "System Admin", email, passwordHash, role: "Admin", status: "Active" },
  });

  // A couple of starter categories.
  for (const name of ["Laptop", "Monitor", "Meeting Room"]) {
    await prisma.assetCategory.upsert({
      where: { name },
      update: {},
      create: {
        name,
        customFields:
          name === "Laptop"
            ? [
                { key: "cpu", label: "CPU", type: "text", options: [], required: false },
                { key: "ram", label: "RAM (GB)", type: "number", options: [], required: false },
              ]
            : [],
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Admin login → ${email} / ${password}`);
  console.log(`Admin id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
