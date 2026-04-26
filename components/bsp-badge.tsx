import { bspBadgeClasses, formatBspDate, getBspStatus } from "@/lib/bsp";

type Props = {
  dueDate: string | null;
  variant?: "compact" | "full";
};

export function BspBadge({ dueDate, variant = "compact" }: Props) {
  const status = getBspStatus(dueDate);
  if (!status) return null;

  const dateLabel = formatBspDate(status.dueDate);
  const text = variant === "full" ? `BSP ${dateLabel} · ${status.label}` : `BSP ${dateLabel}`;

  return (
    <span
      title={`Vencimiento BSP: ${dateLabel} · ${status.label}`}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${bspBadgeClasses(status.tone)}`}
    >
      {text}
    </span>
  );
}
