const ALLOWED_PREFIXES = ["/agency", "/operator", "/invite/", "/onboarding"];

export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (
    next.includes("\n") ||
    next.includes("\r") ||
    next.includes("%0a") ||
    next.includes("%0d") ||
    next.includes("%0A") ||
    next.includes("%0D")
  ) {
    return "/";
  }
  if (next === "/") return "/";
  return ALLOWED_PREFIXES.some((p) => next.startsWith(p)) ? next : "/";
}
