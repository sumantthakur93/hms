import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/actions/billing", () => ({
  getInvoices: vi.fn(),
  getBillableAppointments: vi.fn(),
  generateInvoice: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { InvoiceList } from "@/components/billing/invoice-list";
import { getInvoices, getBillableAppointments } from "@/actions/billing";

const mockGetInvoices = vi.mocked(getInvoices);
const mockGetBillable = vi.mocked(getBillableAppointments);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetInvoices.mockResolvedValue({ ok: true, invoices: [] } as any);
  mockGetBillable.mockResolvedValue({ ok: true, appointments: [] } as any);
});

describe("InvoiceList", () => {
  it("renders Billing title", async () => {
    render(<InvoiceList />);
    await waitFor(() => {
      expect(screen.getByText("Billing")).toBeInTheDocument();
    });
  });

  it("shows Invoices and Generate Invoice tabs", async () => {
    render(<InvoiceList />);
    await waitFor(() => {
      expect(screen.getByText("Invoices")).toBeInTheDocument();
      expect(screen.getByText("Generate Invoice")).toBeInTheDocument();
    });
  });

  it("shows empty state when no invoices", async () => {
    render(<InvoiceList />);
    await waitFor(() => {
      expect(screen.getByText("No invoices found")).toBeInTheDocument();
    });
  });

  it("renders invoice with number and patient", async () => {
    mockGetInvoices.mockResolvedValue({
      ok: true,
      invoices: [
        {
          id: "inv1",
          invoiceNumber: "INV-2025-00001",
          status: "DRAFT",
          totalAmount: 800,
          createdAt: new Date("2025-01-15"),
          patient: { mrn: "MRN-001", firstName: "John", lastName: "Doe" },
        },
      ],
    } as any);
    render(<InvoiceList />);
    await waitFor(() => {
      expect(screen.getByText("INV-2025-00001")).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });
  });

  it("shows status filter buttons", async () => {
    render(<InvoiceList />);
    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
      expect(screen.getByText("DRAFT")).toBeInTheDocument();
      expect(screen.getByText("PAID")).toBeInTheDocument();
    });
  });
});
