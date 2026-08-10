"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TestTube, Plus, Pencil, Ban, IndianRupee } from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTestTypes, deactivateTestType } from "@/actions/lab";

type TestType = {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  description: string | null;
  active: boolean;
};

export function TestTypesList() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    startLoad(async () => {
      const result = await getTestTypes();
      if (result.ok) {
        setTestTypes(result.testTypes as TestType[]);
      }
    });
  }, []);

  function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate test type "${name}"? It will no longer be available for new orders.`)) return;
    setError("");
    startLoad(async () => {
      const result = await deactivateTestType(id);
      if (result.ok) {
        setTestTypes((prev) =>
          prev.map((t) => (t.id === id ? { ...t, active: false } : t)),
        );
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lab Test Types</h1>
          <p className="text-sm text-muted-foreground">
            Manage the catalog of lab tests available for ordering
          </p>
        </div>
        <Button onClick={() => router.push("/admin/test-types/new")}>
          <Plus className="size-4" />
          Add Test Type
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {loading && testTypes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : testTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TestTube className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No test types yet. Add one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testTypes.map((tt) => (
                <TableRow key={tt.id}>
                  <TableCell className="font-medium text-foreground">
                    {tt.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tt.code}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tt.category}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    <span className="inline-flex items-center gap-0.5">
                      <IndianRupee className="size-3.5 text-muted-foreground" />
                      {tt.price.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {tt.active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          router.push(`/admin/test-types/${tt.id}/edit`)
                        }
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {tt.active && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeactivate(tt.id, tt.name)}
                        >
                          <Ban className="size-4 text-amber-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
