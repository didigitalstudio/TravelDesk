// Filtra errores DB internos antes de retornarlos al cliente. Las RPCs
// que quieren mostrar un mensaje al user lo prefijan con "USER:" y este
// helper lo extrae. Cualquier otro error se loguea y se reemplaza por
// un mensaje genérico para no leakear estructura interna.

const SAFE_PREFIXES = ["USER:", "VALIDATION:", "NOT_AUTHORIZED:"];

export function userMessageFromError(
  error: { message?: string } | null | undefined,
  fallback = "Ocurrió un error procesando la operación",
): string {
  if (!error?.message) return fallback;
  for (const prefix of SAFE_PREFIXES) {
    if (error.message.startsWith(prefix)) {
      return error.message.slice(prefix.length).trim();
    }
  }
  if (process.env.NODE_ENV !== "production") {
    console.error("[action error]", error.message);
  }
  return fallback;
}
