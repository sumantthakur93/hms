"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye, EyeOff, Loader2, AlertCircle, ChevronDown, ChevronUp,
  ShieldCheck, Clock, HeartPulse, Check,
} from "lucide-react";
import { signupPatient, checkDuplicatePhone, type SignupInput } from "@/actions/auth";

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
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-600">
            <Check className="size-6 text-white" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">{success}</h2>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-slate-950">
      {/* Left: form */}
      <div className="flex w-full flex-col items-center justify-center p-4 lg:w-1/2">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
              C
            </div>
            <h1 className="text-lg font-bold text-slate-100">Create Your Account</h1>
            <p className="text-sm text-slate-500">Sign up as a patient at CarePoint Hospital</p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Required fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  First name <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Last name <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Phone <span className="text-rose-400">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-700 bg-slate-800 px-3 text-sm text-slate-400">
                  +91
                </span>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full rounded-r-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        A patient with this phone number already exists. If this is a new person in the same family, you can continue.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPhoneWarningDismissed(true)}
                          className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
                        >
                          Continue anyway
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPhone("");
                            setPhoneWarning(false);
                            setPhoneWarningDismissed(false);
                          }}
                          className="rounded-md border border-amber-700 px-3 py-1 text-xs font-medium text-amber-300 hover:bg-amber-900/50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {phoneWarning && phoneWarningDismissed && (
                <p className="mt-1 text-xs text-amber-400">Continuing with duplicate phone number.</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Email <span className="text-rose-400">*</span>
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {password && (
                <div className="mt-1.5 flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i < pwStrength.score
                          ? pwStrength.color
                          : "bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
              )}
              {password && (
                <p className="mt-1 text-xs text-slate-500">{pwStrength.label}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Confirm password <span className="text-rose-400">*</span>
              </label>
              <input
                required
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-rose-400">Passwords do not match.</p>
              )}
            </div>

            {/* Collapsible optional section */}
            <button
              type="button"
              onClick={() => setShowOptional((s) => !s)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              More about you (optional)
              {showOptional ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showOptional && (
              <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-800/30 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Date of birth</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select…</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Blood group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select…</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Emergency name</label>
                    <input
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Emergency phone</label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Relationship</label>
                    <input
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Allergies</label>
                  <input
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g. Penicillin, peanuts"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Medical history</label>
                  <textarea
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (phoneWarning && !phoneWarningDismissed)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right: value props (desktop only) */}
      <div className="hidden flex-col justify-center gap-8 bg-gradient-to-br from-slate-900 to-slate-950 p-12 lg:flex lg:w-1/2">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Your health, one click away</h2>
          <p className="mt-2 text-slate-400">
            Book appointments, view prescriptions, check lab results, and chat with our AI assistant — all in one place.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-950">
              <Clock className="size-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200">24/7 Appointment Booking</h3>
              <p className="text-sm text-slate-500">Book anytime, from anywhere. No more waiting on hold.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-950">
              <ShieldCheck className="size-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200">Secure & Private</h3>
              <p className="text-sm text-slate-500">Your medical records are encrypted and role-access controlled.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-950">
              <HeartPulse className="size-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200">AI Health Assistant</h3>
              <p className="text-sm text-slate-500">Get instant answers about your prescriptions, lab results, and appointments.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) score++;

  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-rose-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-green-500",
  ];
  return { score, label: labels[score], color: colors[score] };
}
