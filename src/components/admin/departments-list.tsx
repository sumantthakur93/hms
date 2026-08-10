"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Pencil, Trash2, IndianRupee } from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDepartments, deleteDepartment } from "@/actions/departments";

type Department = {
  id: string;
  name: string;
  description: string | null;
  consultationFee: number;
  _count?: { doctors: number };
};

export function DepartmentsList() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    startLoad(async () => {
      const result = await getDepartments();
      if (result.ok) {
        setDepartments(result.departments as Department[]);
      }
    });
  }, []);

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete department "${name}"? This cannot be undone.`)) return;
    setError("");
    startLoad(async () => {
      const result = await deleteDepartment(id);
      if (result.ok) {
        setDepartments((prev) => prev.filter((d) => d.id !== id));
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground">
            Manage hospital departments and consultation fees
          </p>
        </div>
        <Button onClick={() => router.push("/admin/departments/new")}>
          <Plus className="size-4" />
          Add Department
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {loading && departments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No departments yet. Add one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Consultation Fee</TableHead>
                <TableHead className="text-center">Doctors</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium text-foreground">
                    {dept.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dept.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    <span className="inline-flex items-center gap-0.5">
                      <IndianRupee className="size-3.5 text-muted-foreground" />
                      {dept.consultationFee.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {dept._count?.doctors ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          router.push(`/admin/departments/${dept.id}/edit`)
                        }
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(dept.id, dept.name)}
                      >
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
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
