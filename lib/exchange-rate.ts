export type MepQuote = {
  buy: number;
  sell: number;
  updatedAt: string;
};

// Dólar MEP (bolsa) desde dolarapi.com — público, sin API key.
// Se usa como referencia al cotizar en ARS.
export async function fetchMepQuote(): Promise<MepQuote | null> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/bolsa", {
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      compra?: number;
      venta?: number;
      fechaActualizacion?: string;
    };
    if (typeof json.venta !== "number") return null;
    return {
      buy: typeof json.compra === "number" ? json.compra : json.venta,
      sell: json.venta,
      updatedAt: json.fechaActualizacion ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
