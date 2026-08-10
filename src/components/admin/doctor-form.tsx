"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "@/components/ui/icon";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getDepartments } from "@/actions/departments";
import { createDoctor, updateDoctor } from "@/actions/schedule";

type Department = {
  id: string;
  name: string;
  consultationFee: number;
};

type DoctorFormProps = {
  mode: "create" | "edit";
  doctorId?: string;
  initialData?: {
    specialization: string;
    licenseNumber: string;
    departmentId: string;
  };
  /** For create mode: list of users with DOCTOR role that don't have a profile yet. */
  availableUsers?: { id: string; name: string; email: string }[];
};

export function DoctorForm({
  mode,
  doctorId,
  initialData,
  availableUsers,
}: DoctorFormProps) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);

  const [userId, setUserId] = useState("");
  const [specialization, setSpecialization] = useState(
    initialData?.specialization ?? "",
  );
  const [licenseNumber, setLicenseNumber] = useState(
    initialData?.licenseNumber ?? "",
  );
  const [departmentId, setDepartmentId] = useState(
    initialData?.departmentId ?? "",
  );

  useEffect(() => {
    startLoadDepts();
  }, []);

  function startLoadDepts() {
    void (async () => {
      const result = await getDepartments();
      if (result.ok) {
        setDepartments(result.departments as Department[]);
      }
    })();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startSave(async () => {
      if (mode === "create") {
        if (!userId) {
          setError("Please select a user");
          return;
        }
        const result = await createDoctor({
          userId,
          specialization,
          licenseNumber,
          departmentId,
        });
        if (result.ok) {
          router.push("/admin/doctors");
        } else {
          setError(result.error);
        }
      } else if (mode === "edit" && doctorId) {
        const result = await updateDoctor(doctorId, {
          specialization,
          licenseNumber,
          departmentId,
        });
        if (result.ok) {
          router.push("/admin/doctors");
        } else {
          setError(result.error);
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/doctors")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "create" ? "Add Doctor" : "Edit Doctor"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "create"
              ? "Create a doctor profile linked to a user account"
              : "Update doctor profile details"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-2">
            <Label htmlFor="userId">User Account</Label>
            <Select value={userId} onValueChange={(v) => setUserId(v ?? "")}>
              <SelectTrigger id="userId">
                <SelectValue placeholder="Select a user with DOCTOR role" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers && availableUsers.length > 0 ? (
                  availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No available users. Create a user with DOCTOR role first.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only users with the DOCTOR role who don&apos;t already have a
              profile are listed.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder="e.g., Cardiology"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="licenseNumber">License Number</Label>
          <Input
            id="licenseNumber"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="e.g., MCI-12345"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="departmentId">Department</Label>
          <Select
            value={departmentId}
            onValueChange={(v) => setDepartmentId(v ?? "")}
          >
            <SelectTrigger id="departmentId">
              <SelectValue placeholder="Select a department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create Doctor"
                : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/doctors")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
