import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Admin User ──────────────────────────────────────────────────────────────

  const adminPassword = await hashPassword("admin123");

  const admin = await prisma.user.upsert({
    where: { email: "admin@carepoint.in" },
    update: {},
    create: {
      email: "admin@carepoint.in",
      name: "System Admin",
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ── Departments ─────────────────────────────────────────────────────────────

  const departments = [
    { name: "General Medicine", consultationFee: 500 },
    { name: "Cardiology", consultationFee: 1000 },
    { name: "Orthopedics", consultationFee: 800 },
    { name: "Pediatrics", consultationFee: 600 },
    { name: "Dermatology", consultationFee: 700 },
    { name: "ENT", consultationFee: 600 },
    { name: "Ophthalmology", consultationFee: 700 },
    { name: "Gynecology", consultationFee: 800 },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
  }
  console.log(`✅ Departments: ${departments.length} created`);

  // ── Test Types ──────────────────────────────────────────────────────────────

  const testTypes = [
    { name: "Complete Blood Count", code: "CBC", category: "Hematology", price: 350 },
    { name: "Lipid Panel", code: "LIPID", category: "Biochemistry", price: 600 },
    { name: "Blood Glucose Fasting", code: "BGF", category: "Biochemistry", price: 150 },
    { name: "Thyroid Profile", code: "THYROID", category: "Endocrinology", price: 800 },
    { name: "Liver Function Test", code: "LFT", category: "Biochemistry", price: 500 },
    { name: "Kidney Function Test", code: "KFT", category: "Biochemistry", price: 500 },
    { name: "Urine Routine", code: "URINE", category: "Microbiology", price: 200 },
    { name: "Chest X-Ray", code: "CXR", category: "Radiology", price: 400 },
  ];

  for (const tt of testTypes) {
    await prisma.testType.upsert({
      where: { code: tt.code },
      update: {},
      create: tt,
    });
  }
  console.log(`✅ Test types: ${testTypes.length} created`);

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
