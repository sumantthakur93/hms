import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/actions/billing", () => ({
  getInvoice: vi.fn(),
  issueInvoice: vi.fn(),
  markPaid: vi.fn(),
  cancelInvoice: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { InvoiceScreen } from "@/components/billing/invoice-screen";
import { getInvoice } from "@/actions/billing";

const mockGetInvoice = vi.mocked(getInvoice);

beforeEach(() => {
  vi.clearAllMocks();
});

const draftInvoice = {
  id: "inv1",
  invoiceNumber: "INV-2025-00001",
  status: "DRAFT",
  totalAmount: 800,
  paymentMethod: null,
  transactionRef: null,
  paidAt: null,
  createdAt: new Date("2025-01-15"),
  patient: { mrn: "MRN-001", firstName: "John", lastName: "Doe", phone: "123" },
  items: [
    {
      id: "i1",
      type: "CONSULTATION_FEE",
      description: "Consultation fee",
      quantity: 1,
      unitPrice: 500,
      amount: 500,
    },
    {
      id: "i2",
      type: "LAB_TEST",
      description: "Lab Test: CBC",
      quantity: 1,
      unitPrice: 300,
      amount: 300,
    },
  ],
  appointment: {
    date: new Date("2025-01-15"),
    startTime: "09:00",
    doctor: {
      department: { name: "General Medicine" },
      user: { name: "Dr. Smith" },
    },
  },
};

const issuedInvoice = { ...draftInvoice, status: "ISSUED" };
const paidInvoice = {
  ...draftInvoice,
  status: "PAID",
  paymentMethod: "CASH",
  paidAt: new Date("2025-01-16"),
};
const cancelledInvoice = { ...draftInvoice, status: "CANCELLED" };

describe("InvoiceScreen", () => {
  it("renders invoice number and patient name", async () => {
    mockGetInvoice.mockResolvedValue({
      ok: true,
      invoice: draftInvoice,
    } as any);
    render(<InvoiceScreen invoiceId="inv1" />);
    await waitFor(() => {
      expect(screen.getByText("Invoice INV-2025-00001")).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });
  });

  it("renders line items table", async () => {
    mockGetInvoice.mockResolvedValue({
      ok: true,
      invoice: draftInvoice,
    } as any);
    render(<InvoiceScreen invoiceId="inv1" />);
    await waitFor(() => {
      expect(screen.getByText("Consultation fee")).toBeInTheDocument();
      expect(screen.getByText("Lab Test: CBC")).toBeInTheDocument();
    });
  });

  it("shows subtotal and total", async () => {
    mockGetInvoice.mockResolvedValue({
      ok: true,
      invoice: draftInvoice,
    } as any);
    render(<InvoiceScreen invoiceId="inv1" />);
    await waitFor(() => {
      expect(screen.getAllByText("₹800.00").length).toBeGreaterThan(0);
    });
  });

  it("shows Issue Invoice and Cancel buttons for DRAFT", async () => {
    mockGetInvoice.mockResolvedValue({
      ok: true,
      invoice: draftInvoice,
    } as any);
    render(<InvoiceScreen invoiceId="inv1" />);
    await waitFor(() => {
      expect(screen.getByText("Issue Invoice")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  it("shows Mark Paid and Download PDF for ISSUED", async () => {
    mockGetInvoice.mockResolvedValue({
      ok: true,
      invoice: issuedInvoice,
    } as any);
    render(<InvoiceScreen invoiceId="inv1" />);
    await waitFor(() => {
      expect(screen.getByText("Mark Paid")).toBeInTheDocument();
      expect(screen.getByText("Download PDF")).toBeInTheDocument();
    });
  });

  it("shows Download PDF and Print for PAID", async () => {
    mockGetInvoice.mockResolvedValue({ ok: true, invoice: paidInvoice } as any);
    render(<InvoiceScreen invoiceId="inv1" />);
    await waitFor(() => {
      expect(screen.getAllByText("Download PDF")).toHaveLength(1);
      expect(screen.getByText("Print")).toBeInTheDocument();
    });
  });

  it("shows payment info for PAID invoice", async () => {
    mockGetInvoice.mockResolvedValue({ ok: true, invoice: paidInvoice } as any);
    render(<InvoiceScreen invoiceId="inv1" />);
    await waitFor(() => {
      expect(screen.getByText("Payment")).toBeInTheDocument();
      expect(screen.getByText("CASH")).toBeInTheDocument();
    });
  });

  it("shows no action buttons for CANCELLED", async () => {
    mockGetInvoice.mockResolvedValue({
      ok: true,
      invoice: cancelledInvoice,
    } as any);
    render(<InvoiceScreen invoiceId="inv1" />);
    await waitFor(() => {
      expect(screen.queryByText("Issue Invoice")).not.toBeInTheDocument();
      expect(screen.queryByText("Mark Paid")).not.toBeInTheDocument();
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    });
  });

  it("shows error when invoice not found", async () => {
    mockGetInvoice.mockResolvedValue({
      ok: false,
      error: "Invoice not found",
    } as any);
    render(<InvoiceScreen invoiceId="nonexistent" />);
    await waitFor(() => {
      expect(screen.getByText("Invoice not found")).toBeInTheDocument();
    });
  });

  it("renders DRAFT status badge", async () => {
    mockGetInvoice.mockResolvedValue({
      ok: true,
      invoice: draftInvoice,
    } as any);
    render(<InvoiceScreen invoiceId="inv1" />);
    await waitFor(() => {
      expect(screen.getByText("DRAFT")).toBeInTheDocument();
    });
  });

  it("renders appointment info when present", async () => {
    mockGetInvoice.mockResolvedValue({
      ok: true,
      invoice: draftInvoice,
    } as any);
    render(<InvoiceScreen invoiceId="inv1" />);
    await waitFor(() => {
      expect(screen.getByText(/Dr\. Smith/)).toBeInTheDocument();
      expect(screen.getByText(/General Medicine/)).toBeInTheDocument();
    });
  });
});
