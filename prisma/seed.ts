import {
  PrismaClient,
  UserRole,
  Gender,
  AppointmentStatus,
  LabTestOrderStatus,
  LabTestPriority,
} from "@prisma/client";
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

  // ── Receptionist ────────────────────────────────────────────────────────────

  const receptionistPassword = await hashPassword("reception123");
  const receptionist = await prisma.user.upsert({
    where: { email: "receptionist@carepoint.in" },
    update: {},
    create: {
      email: "receptionist@carepoint.in",
      name: "Priya Reception",
      password: receptionistPassword,
      role: UserRole.RECEPTIONIST,
    },
  });
  console.log(`✅ Receptionist: ${receptionist.email}`);

  // ── Lab Technician ──────────────────────────────────────────────────────────

  const labPassword = await hashPassword("lab123");
  const labTech = await prisma.user.upsert({
    where: { email: "lab@carepoint.in" },
    update: {},
    create: {
      email: "lab@carepoint.in",
      name: " Amit Lab",
      password: labPassword,
      role: UserRole.LAB_TECHNICIAN,
    },
  });
  console.log(`✅ Lab technician: ${labTech.email}`);

  // ── Departments ─────────────────────────────────────────────────────────────

  const departments = [
    {
      name: "General Medicine",
      consultationFee: 500,
      description:
        "Primary healthcare for everyday illnesses and preventive care.",
    },
    {
      name: "Cardiology",
      consultationFee: 1000,
      description:
        "Comprehensive heart care, from diagnostics to advanced surgical interventions.",
    },
    {
      name: "Orthopedics",
      consultationFee: 800,
      description: "Advanced joint replacement and sports injury treatments.",
    },
    {
      name: "Pediatrics",
      consultationFee: 600,
      description: "Compassionate care for infants, children, and adolescents.",
    },
    {
      name: "Dermatology",
      consultationFee: 700,
      description:
        "Skin, hair, and nail care with advanced dermatological treatments.",
    },
    {
      name: "ENT",
      consultationFee: 600,
      description: "Ear, nose, and throat specialist care.",
    },
    {
      name: "Ophthalmology",
      consultationFee: 700,
      description: "Eye care and vision correction.",
    },
    {
      name: "Gynecology",
      consultationFee: 800,
      description: "Women's health and maternity care.",
    },
  ];

  const deptMap: Record<string, string> = {};
  for (const dept of departments) {
    const d = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
    deptMap[dept.name] = d.id;
  }
  console.log(`✅ Departments: ${departments.length} created`);

  // ── Doctors (4 doctors, one each in Cardiology, General Medicine, Orthopedics, Pediatrics) ──

  const doctorPassword = await hashPassword("doctor123");

  const doctorSpecs = [
    {
      name: "Dr. Rajesh Mehta",
      email: "rajesh.mehta@carepoint.in",
      specialization: "Interventional Cardiologist",
      license: "KMC-001234",
      dept: "Cardiology",
    },
    {
      name: "Dr. Anjali Sharma",
      email: "anjali.sharma@carepoint.in",
      specialization: "General Physician",
      license: "KMC-002345",
      dept: "General Medicine",
    },
    {
      name: "Dr. Vikram Singh",
      email: "vikram.singh@carepoint.in",
      specialization: "Orthopedic Surgeon",
      license: "KMC-003456",
      dept: "Orthopedics",
    },
    {
      name: "Dr. Meera Iyer",
      email: "meera.iyer@carepoint.in",
      specialization: "Pediatrician",
      license: "KMC-004567",
      dept: "Pediatrics",
    },
  ];

  const doctorIds: string[] = [];
  for (const spec of doctorSpecs) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {},
      create: {
        email: spec.email,
        name: spec.name,
        password: doctorPassword,
        role: UserRole.DOCTOR,
      },
    });

    const profile = await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        specialization: spec.specialization,
        licenseNumber: spec.license,
        departmentId: deptMap[spec.dept],
      },
    });
    doctorIds.push(profile.id);
    console.log(`✅ Doctor: ${spec.name} (${spec.dept})`);
  }

  // ── Schedule Blocks (each doctor: Mon–Fri, 09:00–13:00, 30-min slots) ───────

  for (const doctorId of doctorIds) {
    for (let day = 1; day <= 5; day++) {
      await prisma.scheduleBlock.upsert({
        where: {
          id: `${doctorId}-block-${day}`,
        },
        update: {},
        create: {
          id: `${doctorId}-block-${day}`,
          doctorId,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "13:00",
          slotDuration: 30,
        },
      });
    }
  }
  console.log(
    `✅ Schedule blocks: ${doctorIds.length * 5} created (Mon–Fri, 09:00–13:00, 30-min)`,
  );

  // ── Medicines ───────────────────────────────────────────────────────────────

  const medicines = [
    {
      name: "Paracetamol 500mg",
      genericName: "Paracetamol",
      manufacturer: "Cipla",
      category: "Analgesic",
      unitPrice: 2.5,
      reorderLevel: 100,
    },
    {
      name: "Amoxicillin 500mg",
      genericName: "Amoxicillin",
      manufacturer: "Sun Pharma",
      category: "Antibiotic",
      unitPrice: 5.0,
      reorderLevel: 50,
    },
    {
      name: "Metformin 500mg",
      genericName: "Metformin",
      manufacturer: "USV",
      category: "Antidiabetic",
      unitPrice: 3.0,
      reorderLevel: 80,
    },
    {
      name: "Amlodipine 5mg",
      genericName: "Amlodipine",
      manufacturer: "Lupin",
      category: "Antihypertensive",
      unitPrice: 4.0,
      reorderLevel: 60,
    },
    {
      name: "Omeprazole 20mg",
      genericName: "Omeprazole",
      manufacturer: "Dr. Reddy's",
      category: "PPI",
      unitPrice: 6.0,
      reorderLevel: 40,
    },
  ];

  const medMap: Record<string, string> = {};
  for (const med of medicines) {
    const m = await prisma.medicine.upsert({
      where: { name: med.name },
      update: {},
      create: med,
    });
    medMap[med.name] = m.id;

    // Add a batch for each medicine (expires in 1 year)
    await prisma.medicineBatch.upsert({
      where: {
        id: `${m.id}-batch-001`,
      },
      update: {},
      create: {
        id: `${m.id}-batch-001`,
        medicineId: m.id,
        batchNumber: `B-${med.genericName.toUpperCase().slice(0, 4)}-001`,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        quantity: 200,
      },
    });
  }
  console.log(`✅ Medicines: ${medicines.length} created with batches`);

  // ── Test Types ──────────────────────────────────────────────────────────────

  const testTypes = [
    {
      name: "Complete Blood Count",
      code: "CBC",
      category: "Hematology",
      price: 350,
    },
    {
      name: "Lipid Panel",
      code: "LIPID",
      category: "Biochemistry",
      price: 600,
    },
    {
      name: "Blood Glucose Fasting",
      code: "BGF",
      category: "Biochemistry",
      price: 150,
    },
    {
      name: "Thyroid Profile",
      code: "THYROID",
      category: "Endocrinology",
      price: 800,
    },
    {
      name: "Liver Function Test",
      code: "LFT",
      category: "Biochemistry",
      price: 500,
    },
    {
      name: "Kidney Function Test",
      code: "KFT",
      category: "Biochemistry",
      price: 500,
    },
    {
      name: "Urine Routine",
      code: "URINE",
      category: "Microbiology",
      price: 200,
    },
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

  // ── Patients (5 patients: 3 with User accounts, 2 walk-in) ──────────────────

  const patientPassword = await hashPassword("patient123");

  // Patient 1 — with User account (self-registered)
  const p1User = await prisma.user.upsert({
    where: { email: "rahul.kumar@gmail.com" },
    update: {},
    create: {
      email: "rahul.kumar@gmail.com",
      name: "Rahul Kumar",
      password: patientPassword,
      role: UserRole.PATIENT,
    },
  });
  const p1 = await prisma.patient.upsert({
    where: { mrn: "MRN-00001" },
    update: {},
    create: {
      mrn: "MRN-00001",
      userId: p1User.id,
      firstName: "Rahul",
      lastName: "Kumar",
      phone: "+91 98765 43210",
      email: "rahul.kumar@gmail.com",
      dateOfBirth: new Date("1990-05-15"),
      gender: Gender.MALE,
      bloodGroup: "B+",
      address: "123 MG Road, Bengaluru, Karnataka 560001",
      emergencyName: "Sunita Kumar",
      emergencyPhone: "+91 98765 43211",
      emergencyRelation: "Wife",
      allergies: "Penicillin",
      medicalHistory: "Hypertension diagnosed 2023",
    },
  });

  // Patient 2 — with User account
  const p2User = await prisma.user.upsert({
    where: { email: "sneha.patel@gmail.com" },
    update: {},
    create: {
      email: "sneha.patel@gmail.com",
      name: "Sneha Patel",
      password: patientPassword,
      role: UserRole.PATIENT,
    },
  });
  const p2 = await prisma.patient.upsert({
    where: { mrn: "MRN-00002" },
    update: {},
    create: {
      mrn: "MRN-00002",
      userId: p2User.id,
      firstName: "Sneha",
      lastName: "Patel",
      phone: "+91 98123 45678",
      email: "sneha.patel@gmail.com",
      dateOfBirth: new Date("1995-08-22"),
      gender: Gender.FEMALE,
      bloodGroup: "O+",
      address: "456 Indiranagar, Bengaluru, Karnataka 560038",
      emergencyName: "Raj Patel",
      emergencyPhone: "+91 98123 45679",
      emergencyRelation: "Brother",
    },
  });

  // Patient 3 — with User account
  const p3User = await prisma.user.upsert({
    where: { email: "arjun.nair@gmail.com" },
    update: {},
    create: {
      email: "arjun.nair@gmail.com",
      name: "Arjun Nair",
      password: patientPassword,
      role: UserRole.PATIENT,
    },
  });
  const p3 = await prisma.patient.upsert({
    where: { mrn: "MRN-00003" },
    update: {},
    create: {
      mrn: "MRN-00003",
      userId: p3User.id,
      firstName: "Arjun",
      lastName: "Nair",
      phone: "+91 99887 76655",
      email: "arjun.nair@gmail.com",
      dateOfBirth: new Date("1988-03-10"),
      gender: Gender.MALE,
      bloodGroup: "A+",
    },
  });

  // Patient 4 — walk-in (no User account)
  const p4 = await prisma.patient.upsert({
    where: { mrn: "MRN-00004" },
    update: {},
    create: {
      mrn: "MRN-00004",
      firstName: "Lakshmi",
      lastName: "Reddy",
      phone: "+91 90909 80808",
      dateOfBirth: new Date("1972-11-30"),
      gender: Gender.FEMALE,
      bloodGroup: "AB+",
      address: "789 Jayanagar, Bengaluru, Karnataka 560069",
      emergencyName: "Krishna Reddy",
      emergencyPhone: "+91 90909 80809",
      emergencyRelation: "Husband",
    },
  });

  // Patient 5 — walk-in (no User account)
  const p5 = await prisma.patient.upsert({
    where: { mrn: "MRN-00005" },
    update: {},
    create: {
      mrn: "MRN-00005",
      firstName: "Mohammed",
      lastName: "Khan",
      phone: "+91 91234 56700",
      dateOfBirth: new Date("2000-07-18"),
      gender: Gender.MALE,
      bloodGroup: "O-",
    },
  });

  console.log(`✅ Patients: 5 created (3 with accounts, 2 walk-in)`);

  // ── Appointments (3: one CONFIRMED, one CHECKED_IN, one COMPLETED) ──────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Appointment 1 — CONFIRMED (Patient 1 with Dr. Rajesh Mehta / Cardiology)
  const appt1 = await prisma.appointment.create({
    data: {
      patientId: p1.id,
      doctorId: doctorIds[0], // Cardiology
      date: today,
      startTime: "10:00",
      endTime: "10:30",
      status: AppointmentStatus.CONFIRMED,
      reason: "Chest pain and shortness of breath",
    },
  });

  // Appointment 2 — CHECKED_IN (Patient 2 with Dr. Anjali Sharma / General Medicine)
  const appt2 = await prisma.appointment.create({
    data: {
      patientId: p2.id,
      doctorId: doctorIds[1], // General Medicine
      date: today,
      startTime: "09:30",
      endTime: "10:00",
      status: AppointmentStatus.CHECKED_IN,
      reason: "Fever and body ache",
    },
  });

  // Appointment 3 — COMPLETED (Patient 3 with Dr. Vikram Singh / Orthopedics)
  const appt3 = await prisma.appointment.create({
    data: {
      patientId: p3.id,
      doctorId: doctorIds[2], // Orthopedics
      date: today,
      startTime: "09:00",
      endTime: "09:30",
      status: AppointmentStatus.COMPLETED,
      reason: "Knee pain follow-up",
    },
  });

  console.log(`✅ Appointments: 3 created (CONFIRMED, CHECKED_IN, COMPLETED)`);

  // ── Consultation + Prescription (for the COMPLETED appointment) ─────────────

  const consultation = await prisma.consultation.create({
    data: {
      appointmentId: appt3.id,
      doctorId: doctorIds[2],
      patientId: p3.id,
      symptoms: "Right knee pain, worsens with activity, mild swelling",
      diagnosis: "Early osteoarthritis of right knee",
      notes:
        "Advised weight management and physical therapy. Prescribed NSAIDs for pain.",
      vitals: {
        bp: "120/80",
        pulse: "72",
        temp: "98.6",
        weight: "78",
        height: "175",
        spo2: "98",
      },
      completedAt: new Date(),
    },
  });

  const prescription = await prisma.prescription.create({
    data: {
      consultationId: consultation.id,
    },
  });

  await prisma.prescriptionItem.create({
    data: {
      prescriptionId: prescription.id,
      medicineId: medMap["Paracetamol 500mg"],
      dosage: "1 tablet",
      frequency: "TDS",
      duration: "7 days",
      instructions: "Take after meals",
      quantity: 21,
      dispensed: false,
    },
  });

  await prisma.prescriptionItem.create({
    data: {
      prescriptionId: prescription.id,
      medicineId: medMap["Amlodipine 5mg"],
      dosage: "1 tablet",
      frequency: "OD",
      duration: "30 days",
      instructions: "Take in the morning",
      quantity: 30,
      dispensed: false,
    },
  });

  // ── Lab Test Order (for the completed consultation) ─────────────────────────

  await prisma.labTestOrder.create({
    data: {
      patientId: p3.id,
      doctorId: doctorIds[2],
      testTypeId: (await prisma.testType.findUnique({
        where: { code: "CXR" },
      }))!.id,
      consultationId: consultation.id,
      status: LabTestOrderStatus.ORDERED,
      priority: LabTestPriority.NORMAL,
      isInternal: true,
      instructions: "X-ray of right knee, AP and lateral views",
    },
  });

  console.log(
    `✅ Consultation: 1 created with 2 prescription items + 1 lab order`,
  );
  console.log("\n🎉 Seeding complete!");
  console.log("\n📋 Login credentials:");
  console.log("   Admin:         admin@carepoint.in / admin123");
  console.log("   Receptionist:  receptionist@carepoint.in / reception123");
  console.log("   Lab Tech:      lab@carepoint.in / lab123");
  console.log("   Doctor:        rajesh.mehta@carepoint.in / doctor123");
  console.log("   Patient:       rahul.kumar@gmail.com / patient123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
