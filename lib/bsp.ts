export type BspTone = "ok" | "warn" | "danger" | "neutral";

export type BspStatus = {
  tone: BspTone;
  daysLeft: number; // negativo = vencido
  label: string;
  dueDate: Date;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Diferencia en días calendario entre dos fechas (UTC date-only).
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

export function getBspStatus(dueDate: string | null, today: Date = new Date()): BspStatus | null {
  if (!dueDate) return null;
  // dueDate viene como "YYYY-MM-DD" (tipo date de PG). Construir como local
  // para evitar el corrimiento de timezone que da el constructor de strings ISO.
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const daysLeft = daysBetween(today, due);

  let tone: BspTone;
  let label: string;
  if (daysLeft < 0) {
    tone = "neutral";
    label = `Vencida hace ${Math.abs(daysLeft)}d`;
  } else if (daysLeft <= 1) {
    tone = "danger";
    label = daysLeft === 0 ? "Vence hoy" : "Vence mañana";
  } else if (daysLeft <= 7) {
    tone = "warn";
    label = `${daysLeft}d`;
  } else {
    tone = "ok";
    label = `${daysLeft}d`;
  }

  return { tone, daysLeft, label, dueDate: due };
}

export function bspBadgeClasses(tone: BspTone): string {
  switch (tone) {
    case "ok":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40";
    case "warn":
      return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40";
    case "danger":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/40";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  }
}

export function formatBspDate(date: Date): string {
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
