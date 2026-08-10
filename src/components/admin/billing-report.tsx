"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  Activity,
  Clock,
  CheckCircle2,
  IndianRupee,
} from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { invoiceStatusBadge } from "@/components/ui/status-badges";
import { getBillingReport, getInvoices } from "@/actions/billing";

type ReportData = {
  summary: {
    todayRevenue: number;
    monthRevenue: number;
    draftCount: number;
    issuedCount: number;
    paidCount: number;
    cancelledCount: number;
  };
  monthlyRevenue: Array<{ month: string; amount: number }>;
  paymentMethods: Array<{ method: string; count: number; amount: number }>;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  patient: { firstName: string; lastName: string; mrn: string };
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: accent }}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function BillingReport() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [report, setReport] = useState<ReportData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  function loadData(filter: string) {
    startLoad(async () => {
      const [reportResult, invoiceResult] = await Promise.all([
        getBillingReport(),
        getInvoices(filter === "ALL" ? undefined : filter),
      ]);
      if (reportResult.ok) setReport(reportResult);
      if (invoiceResult.ok) setInvoices(invoiceResult.invoices as Invoice[]);
    });
  }

  // Load on mount
  if (!loading && !report) {
    loadData("ALL");
  }

  function handleFilter(filter: string) {
    setStatusFilter(filter);
    loadData(filter);
  }

  const filters = ["ALL", "DRAFT", "ISSUED", "PAID", "CANCELLED"];

  const maxRevenue = report
    ? Math.max(...report.monthlyRevenue.map((m) => m.amount), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Receipt className="size-6 text-primary" />
          Billing Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Revenue analytics and invoice tracking
        </p>
      </div>

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Today's Revenue"
              value={formatCurrency(report.summary.todayRevenue)}
              icon={IndianRupee}
              accent="#22c55e"
            />
            <StatCard
              label="Month Revenue"
              value={formatCurrency(report.summary.monthRevenue)}
              icon={Activity}
              accent="#3b82f6"
            />
            <StatCard
              label="Pending (Draft + Issued)"
              value={report.summary.draftCount + report.summary.issuedCount}
              icon={Clock}
              accent="#f59e0b"
            />
            <StatCard
              label="Paid Invoices"
              value={report.summary.paidCount}
              icon={CheckCircle2}
              accent="#14b8a6"
            />
          </div>

          {/* Revenue trend + Payment methods */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 items-end justify-between gap-2">
                  {report.monthlyRevenue.map((m) => (
                    <div
                      key={m.month}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <div className="text-xs font-medium text-foreground">
                        {m.amount > 0 ? formatCurrency(m.amount) : ""}
                      </div>
                      <div
                        className="w-full rounded-t bg-primary/80 transition-all"
                        style={{
                          height: `${(m.amount / maxRevenue) * 140}px`,
                          minHeight: m.amount > 0 ? "4px" : "0",
                        }}
                      />
                      <div className="text-xs text-muted-foreground">
                        {m.month}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Payment Methods (This Month)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.paymentMethods.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No payments this month
                  </p>
                ) : (
                  <div className="space-y-3">
                    {report.paymentMethods.map((pm) => (
                      <div
                        key={pm.method}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {pm.method.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pm.count} transaction{pm.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(pm.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Invoice table with filter */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <Button
              key={f}
              onClick={() => handleFilter(f)}
              variant={statusFilter === f ? "default" : "outline"}
              size="sm"
              className="rounded-full px-3 py-1 text-xs"
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>

        {loading && invoices.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No invoices found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    onClick={() =>
                      router.push(`/receptionist/billing/${inv.id}`)
                    }
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono text-xs text-foreground">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {inv.patient.firstName} {inv.patient.lastName}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({inv.patient.mrn})
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(inv.createdAt)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(inv.totalAmount)}
                    </TableCell>
                    <TableCell>{invoiceStatusBadge(inv.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
