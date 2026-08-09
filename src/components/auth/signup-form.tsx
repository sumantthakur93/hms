"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Clock,
  HeartPulse,
  Check,
} from "@/components/ui/icon";
import {
  signupPatient,
  checkDuplicatePhone,
  type SignupInput,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";

export function SignupForm() {
  const router = useRouter();

  // Required fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Optional section
  const [showOptional, setShowOptional] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");

  // State
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phoneWarning, setPhoneWarning] = useState(false);
  const [phoneWarningDismissed, setPhoneWarningDismissed] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Password strength
  const pwStrength = getPasswordStrength(password);

  // Check for duplicate phone (debounced via simple timeout)
  const checkPhone = useCallback(async (phoneValue: string) => {
    if (phoneValue.replace(/\D/g, "").length < 10) {
      setPhoneWarning(false);
      return;
    }
    const result = await checkDuplicatePhone(phoneValue);
    if (result.duplicate) {
      setPhoneWarning(true);
    } else {
      setPhoneWarning(false);
    }
  }, []);

  function handlePhoneChange(value: string) {
    setPhone(value);
    setPhoneWarningDismissed(false);
    setPhoneWarning(false);
    // Debounce
    setTimeout(() => checkPhone(value), 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (phoneWarning && !phoneWarningDismissed) {
      // User must dismiss the warning first
      return;
    }

    setLoading(true);

    const input: SignupInput = {
      firstName,
      lastName,
      phone,
      email,
      password,
      dateOfBirth: dateOfBirth || undefined,
      gender: (gender || undefined) as SignupInput["gender"],
      bloodGroup: bloodGroup || undefined,
      address: address || undefined,
      emergencyName: emergencyName || undefined,
      emergencyPhone: emergencyPhone || undefined,
      emergencyRelation: emergencyRelation || undefined,
      allergies: allergies || undefined,
      medicalHistory: medicalHistory || undefined,
    };

    const result = await signupPatient(input);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Auto-login after signup
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInResult && !signInResult.error) {
      router.push("/patient");
      router.refresh();
    } else {
      // Signup succeeded but auto-login failed — show success + link to login
      setSuccess(`Account created! Your MRN is ${result.mrn}. Please sign in.`);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-600">
            <Check className="size-6 text-primary-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {success}
          </h2>
          <Button render={<Link href="/login" />} className="mt-4">
            Sign In
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-background">
      {/* Left: form */}
      <div className="flex w-full flex-col items-center justify-center p-4 lg:w-1/2">
        <Card className="w-full max-w-md p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
              C
            </div>
            <h1 className="text-lg font-bold text-foreground">
              Create Your Account
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign up as a patient at CarePoint Hospital
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Required fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  First name <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Last name <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Phone <span className="text-destructive">*</span>
              </Label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                  +91
                </span>
                <Input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="rounded-l-none"
                  placeholder="98765 43210"
                />
              </div>

              {/* Duplicate phone warning */}
              {phoneWarning && !phoneWarningDismissed && (
                <div className="mt-2 rounded-lg border border-amber-800 bg-amber-950/50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-300">
                        A patient with this phone number already exists. If this
                        is a new person in the same family, you can continue.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setPhoneWarningDismissed(true)}
                          className="bg-amber-700 hover:bg-amber-600"
                        >
                          Continue anyway
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPhone("");
                            setPhoneWarning(false);
                            setPhoneWarningDismissed(false);
                          }}
                          className="border-amber-700 text-amber-300 hover:bg-amber-900/50"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {phoneWarning && phoneWarningDismissed && (
                <p className="mt-1 text-xs text-amber-400">
                  Continuing with duplicate phone number.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
              {/* Password strength indicator */}
              {password && (
                <div className="mt-1.5 flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i < pwStrength.score ? pwStrength.color : "bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
              )}
              {password && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {pwStrength.label}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Confirm password <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-destructive">
                  Passwords do not match.
                </p>
              )}
            </div>

            {/* Collapsible optional section */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOptional((s) => !s)}
              className="w-full justify-between"
            >
              More about you (optional)
              {showOptional ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>

            {showOptional && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date of birth</Label>
                    <DatePicker
                      value={dateOfBirth}
                      onChange={setDateOfBirth}
                      placeholder="Pick a date"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Gender</Label>
                    <Select
                      value={gender}
                      onValueChange={(v) => setGender(v ?? "")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Blood group</Label>
                  <Select
                    value={bloodGroup}
                    onValueChange={(v) => setBloodGroup(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                        (bg) => (
                          <SelectItem key={bg} value={bg}>
                            {bg}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Address</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Emergency name</Label>
                    <Input
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Emergency phone</Label>
                    <Input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Relationship</Label>
                    <Input
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Allergies</Label>
                  <Input
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, peanuts"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Medical history</Label>
                  <Textarea
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (phoneWarning && !phoneWarningDismissed)}
              className="w-full"
              size="lg"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Creating account…" : "Create Account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:text-primary"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>

      {/* Right: value props (desktop only) */}
      <div className="hidden flex-col justify-center gap-8 bg-gradient-to-br from-card to-background p-12 lg:flex lg:w-1/2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Your health, one click away
          </h2>
          <p className="mt-2 text-muted-foreground">
            Book appointments, view prescriptions, check lab results, and chat
            with our AI assistant — all in one place.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                24/7 Appointment Booking
              </h3>
              <p className="text-sm text-muted-foreground">
                Book anytime, from anywhere. No more waiting on hold.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Secure & Private
              </h3>
              <p className="text-sm text-muted-foreground">
                Your medical records are encrypted and role-access controlled.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <HeartPulse className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                AI Health Assistant
              </h3>
              <p className="text-sm text-muted-foreground">
                Get instant answers about your prescriptions, lab results, and
                appointments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function getPasswordStrength(pw: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) score++;

  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-amber-500",
    "bg-blue-500",
    "bg-green-500",
  ];
  return { score, label: labels[score], color: colors[score] };
}
