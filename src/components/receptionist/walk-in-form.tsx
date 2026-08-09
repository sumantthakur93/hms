"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { walkInRegistration } from "@/actions/appointments";

export function WalkInForm({
  onRegistered,
}: {
  onRegistered?: (patientId: string, patientName: string) => void;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    name: string;
    mrn: string;
    id: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await walkInRegistration({ firstName, lastName, phone });
      if (result.ok) {
        const name = `${result.patient.firstName} ${result.patient.lastName}`;
        setSuccess({ name, mrn: result.patient.mrn, id: result.patient.id });
        setFirstName("");
        setLastName("");
        setPhone("");
        onRegistered?.(result.patient.id, name);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (success) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <CheckCircle2 className="size-5 text-green-500" />
          <div>
            <p className="font-medium text-foreground">{success.name}</p>
            <p className="text-xs text-muted-foreground">
              Registered · MRN: {success.mrn}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setSuccess(null)}
        >
          Register Another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">First name</Label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            placeholder="Rahul"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Last name</Label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            placeholder="Sharma"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Phone</Label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="9876543210"
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Registering...
          </>
        ) : (
          <>
            <UserPlus className="size-4" />
            Quick Register
          </>
        )}
      </Button>
    </form>
  );
}
