import { Badge } from "@/components/ui/badge";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

/** Map an appointment status string to a Badge component. */
export function appointmentStatusBadge(status: string) {
  const variant: BadgeVariant =
    status === "COMPLETED"
      ? "default"
      : status === "CHECKED_IN"
        ? "secondary"
        : status === "CANCELLED"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}

/** Map an invoice status string to a Badge component. */
export function invoiceStatusBadge(status: string) {
  const variant: BadgeVariant =
    status === "PAID"
      ? "default"
      : status === "ISSUED"
        ? "secondary"
        : status === "CANCELLED"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

/** Map a lab test order status string to a Badge component. */
export function labStatusBadge(status: string) {
  const variant: BadgeVariant =
    status === "COMPLETED"
      ? "default"
      : status === "PROCESSING"
        ? "secondary"
        : status === "CANCELLED"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}

/** Map a priority string to a Badge component. */
export function priorityBadge(priority: string) {
  const variant: BadgeVariant =
    priority === "URGENT" ? "destructive" : "secondary";
  return <Badge variant={variant}>{priority}</Badge>;
}
