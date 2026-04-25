import { STATUS_LABELS, statusBadgeClasses, type RequestStatus } from "@/lib/requests";

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClasses(status)}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
