import { NextRequest, NextResponse } from "next/server";
import { getInvoice } from "@/actions/billing";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  const result = await getInvoice(invoiceId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const { invoice } = result;
  const patient = invoice.patient;
  const date = new Date(invoice.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const itemsHtml = invoice.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.description}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">₹${item.unitPrice.toFixed(2)}</td>
        <td style="text-align:right">₹${item.amount.toFixed(2)}</td>
      </tr>
    `,
    )
    .join("");

  const paymentInfo = invoice.paidAt
    ? `
      <div style="margin-top:20px;padding:10px;background:#f0fdf4;border-radius:8px;">
        <strong>Payment Status:</strong> PAID<br>
        <strong>Method:</strong> ${invoice.paymentMethod?.replace(/_/g, " ") ?? "—"}<br>
        ${invoice.transactionRef ? `<strong>Transaction Ref:</strong> ${invoice.transactionRef}<br>` : ""}
        <strong>Paid On:</strong> ${new Date(invoice.paidAt).toLocaleDateString("en-IN")}
      </div>
    `
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${invoice.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
  .header .hospital h1 { color: #2563eb; font-size: 22px; }
  .header .hospital p { font-size: 12px; color: #666; margin-top: 4px; }
  .header .invoice-meta { text-align: right; }
  .header .invoice-meta h2 { font-size: 18px; }
  .header .invoice-meta p { font-size: 12px; color: #666; margin-top: 4px; }
  .patient-info { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 20px; }
  .patient-info div { line-height: 1.6; }
  .patient-info .label { color: #666; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { text-align: left; font-size: 12px; color: #666; padding: 8px 4px; border-bottom: 1px solid #ddd; }
  th.right { text-align: right; }
  td { font-size: 13px; padding: 8px 4px; border-bottom: 1px solid #eee; }
  td.right { text-align: right; }
  .totals { margin-top: 16px; display: flex; justify-content: flex-end; }
  .totals table { width: 250px; }
  .totals .total-row { font-size: 16px; font-weight: bold; border-top: 2px solid #2563eb; }
  .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 16px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="hospital">
      <h1>${siteConfig.name}</h1>
      <p>${siteConfig.contact.address}</p>
      <p>Phone: ${siteConfig.contact.phone}</p>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p><strong>${invoice.invoiceNumber}</strong></p>
      <p>Date: ${date}</p>
      <p>Status: ${invoice.status}</p>
    </div>
  </div>

  <div class="patient-info">
    <div>
      <span class="label">Patient:</span> ${patient.firstName} ${patient.lastName}<br>
      <span class="label">MRN:</span> ${patient.mrn}<br>
      <span class="label">Phone:</span> ${patient.phone}
    </div>
    ${
      invoice.appointment
        ? `<div style="text-align:right">
      <span class="label">Appointment:</span> ${new Date(invoice.appointment.date).toLocaleDateString("en-IN")}<br>
      <span class="label">Doctor:</span> ${invoice.appointment.doctor.user.name ?? "—"}<br>
      <span class="label">Department:</span> ${invoice.appointment.doctor.department.name}
    </div>`
        : ""
    }
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th class="right">Qty</th>
        <th class="right">Rate</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Subtotal</td>
        <td class="right">₹${invoice.items.reduce((s, i) => s + i.amount, 0).toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td>Total</td>
        <td class="right">₹${invoice.totalAmount.toFixed(2)}</td>
      </tr>
    </table>
  </div>

  ${paymentInfo}

  <div class="footer">
    This is a computer-generated invoice. Thank you for choosing ${siteConfig.name}.
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
