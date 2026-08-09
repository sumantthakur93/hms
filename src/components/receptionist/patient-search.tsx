"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, User } from "lucide-react";
import { searchPatients } from "@/actions/patients";

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
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          placeholder="Search by name, phone, or MRN..."
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-500" />
        )}
      </div>

      {/* Results */}
      {hasSearched && !loading && results.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-500">
          No patients found for &ldquo;{query}&rdquo;
        </p>
      )}

      {results.length > 0 && (
        <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/receptionist?edit=${p.id}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/50"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-800">
                <User className="size-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">
                  {p.firstName} {p.lastName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  <span className="font-mono">{p.mrn}</span> · {p.phone}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-500">Last visit</p>
                <p className="text-xs font-medium text-slate-400">
                  {new Date(p.lastVisit).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
