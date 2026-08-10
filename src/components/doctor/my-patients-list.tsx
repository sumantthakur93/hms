"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Search } from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMyPatients } from "@/actions/consultations";

type Patient = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  lastConsultationDate: Date | null;
};

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function MyPatientsList() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    startLoad(async () => {
      const result = await getMyPatients();
      if (result.ok) {
        setPatients(result.patients as Patient[]);
      }
    });
  }, []);

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Patients</h1>
        <p className="text-sm text-muted-foreground">
          Patients you have consulted
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, MRN, or phone…"
          className="pl-9"
        />
      </div>

      {loading && patients.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {search ? "No patients match your search" : "No patients yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Last Consultation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow
                  key={p.id}
                  onClick={() => router.push(`/doctor/patients/${p.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium text-foreground">
                    {p.firstName} {p.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.mrn}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.gender ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(p.lastConsultationDate)}
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
