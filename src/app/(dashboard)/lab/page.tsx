import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ListTodo, CheckCircle2 } from "@/components/ui/icon";

export default function LabDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Lab Technician Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage test queue and enter results.
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/lab/queue">
          <Button>
            <ListTodo className="size-4" />
            Test Queue
          </Button>
        </Link>
        <Link href="/lab/completed">
          <Button variant="outline">
            <CheckCircle2 className="size-4" />
            Completed Tests
          </Button>
        </Link>
      </div>
    </div>
  );
}
