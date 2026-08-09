import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PatientSearch } from "@/components/receptionist/patient-search";
import { PatientRegistrationForm } from "@/components/receptionist/patient-registration-form";
import { PatientEditForm } from "@/components/receptionist/patient-edit-form";
import { getPatient } from "@/actions/patients";
import { UserPlus, Search, Edit3, X } from "lucide-react";

export default async function ReceptionistDashboard({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "RECEPTIONIST") {
    redirect("/admin");
  }

  const params = await searchParams;
  const editId = params.edit;

  let editPatient: Awaited<ReturnType<typeof getPatient>> | null = null;
  if (editId) {
    editPatient = await getPatient(editId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Receptionist Dashboard
        </h1>
        <p className="text-sm text-slate-400">
          Register patients, search records, and manage demographics
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Search + Registration */}
        <div className="space-y-6">
          {/* Patient Search */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Search className="size-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-slate-100">
                Patient Search
              </h2>
            </div>
            <PatientSearch />
          </section>

          {/* Walk-in Registration */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus className="size-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-slate-100">
                Walk-in Registration
              </h2>
            </div>
            <PatientRegistrationForm />
          </section>
        </div>

        {/* Right: Edit panel or placeholder */}
        <div>
          {editPatient?.ok ? (
            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="size-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-slate-100">
                    Edit Patient
                  </h2>
                </div>
                <a
                  href="/receptionist"
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="size-4" />
                </a>
              </div>
              <PatientEditForm patient={editPatient.patient} />
            </section>
          ) : (
            <section className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-5 text-center">
              <Search className="mb-3 size-8 text-slate-700" />
              <p className="text-sm text-slate-500">
                Search for a patient above and select them to edit their
                demographics
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
