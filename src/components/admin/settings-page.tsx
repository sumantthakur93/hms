"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Settings,
  Users,
  UserPlus,
  Building2,
  Trash2,
  Lock,
} from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getHospitalSetting,
  updateHospitalSetting,
  getUsers,
  deactivateUser,
  resetPassword,
} from "@/actions/settings";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  emailVerified: Date | null;
  createdAt: Date;
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    ADMIN: "bg-purple-500/10 text-purple-600",
    DOCTOR: "bg-blue-500/10 text-blue-600",
    RECEPTIONIST: "bg-teal-500/10 text-teal-600",
    LAB_TECHNICIAN: "bg-amber-500/10 text-amber-600",
    PATIENT: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[role] ?? colors.PATIENT}`}
    >
      {role.replace(/_/g, " ")}
    </span>
  );
}

function HospitalInfoTab() {
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    logoUrl: "",
  });

  useEffect(() => {
    startLoad(async () => {
      const result = await getHospitalSetting();
      if (result.ok) {
        setForm({
          name: result.setting.name,
          address: result.setting.address ?? "",
          phone: result.setting.phone ?? "",
          email: result.setting.email ?? "",
          logoUrl: result.setting.logoUrl ?? "",
        });
      }
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startSave(async () => {
      const result = await updateHospitalSetting(form);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  if (loading && form.name === "") {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Hospital Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoUrl">Logo URL</Label>
        <Input
          id="logoUrl"
          value={form.logoUrl}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
          placeholder="https://…"
        />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save Settings"}
      </Button>
    </form>
  );
}

function UsersTab() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, startAction] = useTransition();

  useEffect(() => {
    startLoad(async () => {
      const result = await getUsers();
      if (result.ok) {
        setUsers(result.users as User[]);
      }
    });
  }, []);

  function handleDeactivate(id: string, name: string) {
    if (
      !confirm(
        `Deactivate ${name}? This will permanently delete their account.`,
      )
    )
      return;
    setError(null);
    startAction(async () => {
      const result = await deactivateUser(id);
      if (result.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } else {
        setError(result.error);
      }
    });
  }

  function handleResetPassword(id: string, name: string) {
    const pw = prompt(`Enter new password for ${name}:`);
    if (!pw) return;
    setError(null);
    startAction(async () => {
      const result = await resetPassword(id, pw);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  if (loading && users.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => router.push("/admin/settings/users/new")}>
          <UserPlus className="size-4" />
          Add User
        </Button>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-foreground">
                    {u.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email ?? "—"}
                  </TableCell>
                  <TableCell>{roleBadge(u.role)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          handleResetPassword(u.id, u.name ?? u.email ?? "user")
                        }
                        aria-label="Reset password"
                      >
                        <Lock className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          handleDeactivate(u.id, u.name ?? u.email ?? "user")
                        }
                        aria-label="Deactivate"
                      >
                        <Trash2 className="size-4" />
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

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Settings className="size-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage hospital information and user accounts
        </p>
      </div>

      <Tabs defaultValue="hospital">
        <TabsList>
          <TabsTrigger value="hospital">
            <Building2 className="size-4" />
            Hospital Info
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="size-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hospital" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Hospital Information</CardTitle>
            </CardHeader>
            <CardContent>
              <HospitalInfoTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
