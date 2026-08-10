"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { invoiceStatusBadge } from "@/components/ui/status-badges";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Download,
  Printer,
  Ban,
  CheckCircle2,
  Send,
  Banknote,
  Phone,
  CreditCard,
  Building2,
} from "@/components/ui/icon";
import {
  getInvoice,
  issueInvoice,
  markPaid,
  cancelInvoice,
} from "@/actions/billing";

type InvoiceItem = {
  id: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  paymentMethod: string | null;
  transactionRef: string | null;
  paidAt: Date | null;
  createdAt: Date;
  patient: {
    mrn: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  items: InvoiceItem[];
  appointment: {
    date: Date;
    startTime: string;
    doctor: {
      department: { name: string };
      user: { name: string | null };
    };
  } | null;
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "UPI", label: "UPI", icon: Phone },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2 },
] as const;

export function InvoiceScreen({ invoiceId }: { invoiceId: string }) {
  const [loading, startLoad] = useTransition();
  const [acting, startAction] = useTransition();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [transactionRef, setTransactionRef] = useState("");

  function loadInvoice() {
    startLoad(async () => {
      const result = await getInvoice(invoiceId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInvoice(result.invoice as Invoice);
    });
  }

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  function handleIssue() {
    setError(null);
    startAction(async () => {
      const result = await issueInvoice(invoiceId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      loadInvoice();
    });
  }

  function handleMarkPaid() {
    setError(null);
    startAction(async () => {
      const result = await markPaid({
        invoiceId,
        paymentMethod: paymentMethod as
          | "CASH"
          | "UPI"
          | "CARD"
          | "BANK_TRANSFER",
        transactionRef: transactionRef || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPayDialogOpen(false);
      loadInvoice();
    });
  }

  function handleCancel() {
    setError(null);
    startAction(async () => {
      const result = await cancelInvoice(invoiceId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      loadInvoice();
    });
  }

  if (loading && !invoice) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
        <Link href="/receptionist/billing">
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            Back to Billing
          </Button>
        </Link>
      </div>
    );
  }

  if (!invoice) return null;

  const isDraft = invoice.status === "DRAFT";
  const isIssued = invoice.status === "ISSUED";
  const isPaid = invoice.status === "PAID";
  const isCancelled = invoice.status === "CANCELLED";
  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/receptionist/billing">
            <Button variant="ghost" size="icon-sm" aria-label="Back">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              {invoice.patient.firstName} {invoice.patient.lastName} · MRN:{" "}
              {invoice.patient.mrn}
            </p>
          </div>
        </div>
        {invoiceStatusBadge(invoice.status)}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Appointment info */}
      {invoice.appointment && (
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground">
              Appointment: {formatDate(invoice.appointment.date)} at{" "}
              {invoice.appointment.startTime}
              {" · Dr. "}
              {invoice.appointment.doctor.user.name ?? "—"}
              {" · "}
              {invoice.appointment.doctor.department.name}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Line items */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Line Items
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 text-left font-medium">Description</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Rate (₹)</th>
                  <th className="py-2 text-right font-medium">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="py-3 pr-2 text-foreground">
                      {item.description}
                    </td>
                    <td className="py-3 pr-2 text-right text-foreground">
                      {item.quantity}
                    </td>
                    <td className="py-3 pr-2 text-right text-foreground">
                      ₹{item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-3 pr-2 text-right font-medium text-foreground">
                      ₹{item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-bold text-foreground">
                <span>Total</span>
                <span>₹{invoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment info (if paid) */}
      {isPaid && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              Payment
            </h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Method</dt>
                <dd className="text-foreground">
                  {invoice.paymentMethod?.replace(/_/g, " ") ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Paid At</dt>
                <dd className="text-foreground">
                  {invoice.paidAt ? formatDate(invoice.paidAt) : "—"}
                </dd>
              </div>
              {invoice.transactionRef && (
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Transaction Ref
                  </dt>
                  <dd className="text-foreground">{invoice.transactionRef}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {!isCancelled && (
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <>
              <Button
                onClick={handleIssue}
                disabled={acting}
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="size-4" />
                Issue Invoice
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={acting}
              >
                <Ban className="size-4" />
                Cancel
              </Button>
            </>
          )}
          {isIssued && (
            <>
              <Button onClick={() => setPayDialogOpen(true)} disabled={acting}>
                <CheckCircle2 className="size-4" />
                Mark Paid
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={acting}
              >
                <Ban className="size-4" />
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")
                }
              >
                <Download className="size-4" />
                Download PDF
              </Button>
            </>
          )}
          {isPaid && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")
                }
              >
                <Download className="size-4" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")
                }
              >
                <Printer className="size-4" />
                Print
              </Button>
            </>
          )}
        </div>
      )}

      {/* Mark Paid Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Select a payment method for {invoice.invoiceNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <Button
                      key={method.value}
                      type="button"
                      variant={
                        paymentMethod === method.value ? "default" : "outline"
                      }
                      onClick={() => setPaymentMethod(method.value)}
                      className="flex items-center justify-start gap-2"
                    >
                      <Icon className="size-4" />
                      {method.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-ref">Transaction Reference (optional)</Label>
              <Input
                id="txn-ref"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="UPI ID, card last 4, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} disabled={acting}>
              <CheckCircle2 className="size-4" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
