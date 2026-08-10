"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, Plus } from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDoctors } from "@/actions/schedule";

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  department: string;
  scheduleBlocks: { id: string; dayOfWeek: number; startTime: string; endTime: string; slotDuration: number }[];
  blockedDates: { id: string; date: Date; reason: string | null }[];
};

export function DoctorsList() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    startLoad(async () => {
      const result = await getDoctors();
      setDoctors(result as Doctor[]);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Doctors</h1>
          <p className="text-sm text-muted-foreground">
            Manage doctor profiles and schedules
          </p>
        </div>
        <Button onClick={() => router.push("/admin/doctors/new")}>
          <Plus className="size-4" />
          Add Doctor
        </Button>
      </div>

      {loading && doctors.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : doctors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Stethoscope className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No doctors found. Add one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-center">Schedule Blocks</TableHead>
                <TableHead className="text-center">Blocked Dates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doc) => (
                <TableRow
                  key={doc.id}
                  onClick={() => router.push(`/admin/doctors/${doc.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium text-foreground">
                    {doc.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.specialization}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.department}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {doc.scheduleBlocks.length}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {doc.blockedDates.length}
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
