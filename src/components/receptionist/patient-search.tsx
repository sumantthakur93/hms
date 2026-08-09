"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, User } from "@/components/ui/icon";
import { searchPatients } from "@/actions/patients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PatientResult = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  phone: string;
  lastVisit: Date;
};

export function PatientSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    const result = await searchPatients(q);
    if (result.ok) {
      setResults(result.patients);
    }
    setLoading(false);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    doSearch(q);
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleChange}
          className="pl-10"
          placeholder="Search by name, phone, or MRN..."
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results */}
      {hasSearched && !loading && results.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No patients found for &ldquo;{query}&rdquo;
        </p>
      )}

      {results.length > 0 && (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {results.map((p) => (
            <Button
              key={p.id}
              variant="ghost"
              onClick={() => router.push(`/receptionist?edit=${p.id}`)}
              className="flex w-full items-center gap-3 justify-start px-4 py-3 h-auto font-normal"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate text-sm font-medium text-foreground">
                  {p.firstName} {p.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-mono">{p.mrn}</span> · {p.phone}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">Last visit</p>
                <p className="text-xs font-medium text-muted-foreground">
                  {new Date(p.lastVisit).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
