"use client";

import { useState, useTransition } from "react";
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
import { searchPatients } from "@/actions/patients";

type Patient = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  phone: string;
  lastVisit: Date;
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PatientsList() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  function handleSearch(value: string) {
    setSearch(value);
    if (value.trim().length < 2) {
      setPatients([]);
      setHasSearched(false);
      return;
    }
    setHasSearched(true);
    startLoad(async () => {
      const result = await searchPatients(value);
      if (result.ok) {
        setPatients(result.patients as Patient[]);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patients</h1>
        <p className="text-sm text-muted-foreground">
          Search and browse all registered patients
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, phone, or MRN…"
          className="pl-9"
        />
      </div>

      {loading && patients.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {hasSearched ? "Searching…" : "Type at least 2 characters to search"}
        </p>
      ) : patients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {hasSearched
                ? `No patients match "${search}"`
                : "Start typing to search for patients"}
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
                <TableHead>Last Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((p) => (
                <TableRow
                  key={p.id}
                  onClick={() => router.push(`/admin/patients/${p.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium text-foreground">
                    {p.firstName} {p.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.mrn}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(p.lastVisit)}
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
