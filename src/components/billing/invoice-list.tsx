"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Plus } from "@/components/ui/icon";
import { getInvoices, getBillableAppointments, generateInvoice } from "@/actions/billing";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  patient: { mrn: string; firstName: string; lastName: string };
};

type Appointment = {
  id: string;
  date: Date;
  patient: { mrn: string; firstName: string; lastName: string };
  doctor: {
    department: { name: string };
    user: { name: string | null };
  };
};

function statusBadge(status: string) {
  const variant: "default" | "secondary" | "outline" | "destructive" =
    status === "PAID" ? "default" : status === "ISSUED" ? "secondary" : status === "CANCELLED" ? "destructive" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InvoiceList() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [generating, startGenerate] = useTransition();
  const [tab, setTab] = useState<"invoices" | "billable">("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billable, setBillable] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  function loadInvoices() {
    startLoad(async () => {
      const result = await getInvoices(filter);
      if (result.ok) setInvoices(result.invoices as Invoice[]);
    });
  }

  function loadBillable() {
    startLoad(async () => {
      const result = await getBillableAppointments();
      if (result.ok) setBillable(result.appointments as Appointment[]);
    });
  }

  useEffect(() => {
    if (tab === "invoices") loadInvoices();
    else loadBillable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filter]);

  function handleGenerate(appointmentId: string) {
    setError(null);
    startGenerate(async () => {
      const result = await generateInvoice(appointmentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.ok) {
        setTab("invoices");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Generate invoices and track payments
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          variant={tab === "invoices" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("invoices")}
        >
          <Receipt className="size-4" />
          Invoices
        </Button>
        <Button
          variant={tab === "billable" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("billable")}
        >
          <Plus className="size-4" />
          Generate Invoice
        </Button>
      </div>

      {/* Status filter for invoices tab */}
      {tab === "invoices" && (
        <div className="flex gap-2">
          {["ALL", "DRAFT", "ISSUED", "PAID", "CANCELLED"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "ALL" ? "All" : f}
            </Button>
          ))}
        </div>
      )}

      {/* Invoices list */}
      {tab === "invoices" && (
        <>
          {loading && invoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : invoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="size-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">No invoices found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <Card key={inv.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-foreground">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.patient.firstName} {inv.patient.lastName} · MRN: {inv.patient.mrn}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(inv.createdAt)} · ₹{inv.totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusBadge(inv.status)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/receptionist/billing/${inv.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Billable appointments */}
      {tab === "billable" && (
        <>
          {loading && billable.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : billable.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Plus className="size-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No billable appointments — all completed appointments have invoices
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {billable.map((appt) => (
                <Card key={appt.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {appt.patient.firstName} {appt.patient.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        MRN: {appt.patient.mrn} · {appt.doctor.department.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(appt.date)} · Dr. {appt.doctor.user.name ?? "—"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleGenerate(appt.id)}
                      disabled={generating}
                    >
                      <Plus className="size-4" />
                      Generate
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
