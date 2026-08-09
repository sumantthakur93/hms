"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pill, Search, Plus, AlertTriangle } from "@/components/ui/icon";
import { getMedicines } from "@/actions/pharmacy";

type Medicine = {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string | null;
  category: string | null;
  unitPrice: number;
  reorderLevel: number;
  active: boolean;
  totalStock: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  batchCount: number;
};

function stockBadge(status: string) {
  const variant: "default" | "secondary" | "destructive" =
    status === "IN_STOCK" ? "default" : status === "LOW_STOCK" ? "secondary" : "destructive";
  const label =
    status === "IN_STOCK" ? "In Stock" : status === "LOW_STOCK" ? "Low Stock" : "Out of Stock";
  return <Badge variant={variant}>{label}</Badge>;
}

export function MedicinesList() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "LOW_STOCK">("ALL");
  const [lowStockCount, setLowStockCount] = useState(0);

  function loadMeds() {
    startLoad(async () => {
      const result = await getMedicines({
        search: search || undefined,
        category: category !== "ALL" ? category : undefined,
        activeOnly: filter === "ACTIVE",
        lowStockOnly: filter === "LOW_STOCK",
      });
      if (result.ok) {
        setMedicines(result.medicines as Medicine[]);
        setLowStockCount(
          result.medicines.filter((m) => m.stockStatus !== "IN_STOCK").length,
        );
      }
    });
  }

  useEffect(() => {
    loadMeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, category]);

  function handleSearch() {
    loadMeds();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pharmacy Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Manage medicines, batches, and stock
          </p>
        </div>
        <Button onClick={() => router.push("/admin/medicines/new")}>
          <Plus className="size-4" />
          Add Medicine
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertTriangle className="size-4" />
            <span>
              {lowStockCount} medicine{lowStockCount !== 1 ? "s" : ""} below reorder level
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter("LOW_STOCK")}
          >
            View all
          </Button>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name, generic, or manufacturer…"
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setCategory("ALL")}>
          All Categories
        </Button>
        <Button
          variant={filter === "ACTIVE" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("ACTIVE")}
        >
          Active
        </Button>
        <Button
          variant={filter === "LOW_STOCK" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("LOW_STOCK")}
        >
          Low Stock
        </Button>
        <Button
          variant={filter === "ALL" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("ALL")}
        >
          All
        </Button>
      </div>

      {/* Medicines table */}
      {loading && medicines.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : medicines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Pill className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No medicines found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 text-left font-medium">Name</th>
                <th className="py-2 text-left font-medium">Generic</th>
                <th className="py-2 text-left font-medium">Category</th>
                <th className="py-2 text-right font-medium">Price (₹)</th>
                <th className="py-2 text-right font-medium">Stock</th>
                <th className="py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med) => (
                <tr
                  key={med.id}
                  onClick={() => router.push(`/admin/medicines/${med.id}`)}
                  className="cursor-pointer border-b border-border/50 hover:bg-muted/50"
                >
                  <td className="py-3 pr-2">
                    <span className="font-medium text-foreground">{med.name}</span>
                    {!med.active && (
                      <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
                    )}
                  </td>
                  <td className="py-3 pr-2 text-muted-foreground">{med.genericName}</td>
                  <td className="py-3 pr-2 text-muted-foreground">{med.category ?? "—"}</td>
                  <td className="py-3 pr-2 text-right text-foreground">
                    ₹{med.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-3 pr-2 text-right text-foreground">{med.totalStock}</td>
                  <td className="py-3 pr-2">{stockBadge(med.stockStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
