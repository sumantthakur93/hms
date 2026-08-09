import { NextRequest, NextResponse } from "next/server";
import { getPrescription } from "@/actions/consultations";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ prescriptionId: string }> },
) {
  const { prescriptionId } = await params;
  const result = await getPrescription(prescriptionId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const { prescription } = result;
  const patient = prescription.consultation.patient;
  const doctor = prescription.consultation.doctor.user.name ?? "Unknown Doctor";
  const date = new Date(
    prescription.consultation.appointment.date,
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Generate a simple printable HTML page (browser print-to-PDF)
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Prescription — ${patient.mrn}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { color: #2563eb; font-size: 24px; }
  .header p { font-size: 13px; color: #666; margin-top: 4px; }
  .rx-symbol { font-size: 28px; font-weight: bold; color: #2563eb; margin: 16px 0 12px; }
  .patient-info { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 16px; }
  .patient-info div { line-height: 1.6; }
  .patient-info .label { color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { text-align: left; font-size: 12px; color: #666; padding: 8px 4px; border-bottom: 1px solid #ddd; }
  td { font-size: 13px; padding: 8px 4px; border-bottom: 1px solid #eee; }
  .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 16px; font-size: 11px; color: #999; text-align: center; }
  .doctor-sign { margin-top: 32px; font-size: 13px; }
  .doctor-sign .line { border-top: 1px solid #333; width: 200px; margin-bottom: 4px; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${siteConfig.name}</h1>
    <p>${siteConfig.contact.address}</p>
    <p>Phone: ${siteConfig.contact.phone}</p>
  </div>

  <div class="patient-info">
    <div>
      <span class="label">Patient:</span> ${patient.firstName} ${patient.lastName}<br>
      <span class="label">MRN:</span> ${patient.mrn}<br>
      <span class="label">Gender:</span> ${patient.gender ?? "—"}
    </div>
    <div style="text-align: right;">
      <span class="label">Date:</span> ${date}<br>
      <span class="label">Doctor:</span> ${doctor}<br>
    </div>
  </div>

  <div class="rx-symbol">Rx</div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Medicine</th>
        <th>Dosage</th>
        <th>Frequency</th>
        <th>Duration</th>
        <th>Instructions</th>
      </tr>
    </thead>
    <tbody>
      ${prescription.items
        .map(
          (item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${item.medicine.name}</strong></td>
          <td>${item.dosage}</td>
          <td>${item.frequency}</td>
          <td>${item.duration}</td>
          <td>${item.instructions ?? ""}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="doctor-sign">
    <div class="line"></div>
    ${doctor}
  </div>

  <div class="footer">
    This is a computer-generated prescription. Please verify before use.
  </div>

  <script class="no-print">
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
