import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { QuotePdf } from "@/lib/pdf/quote-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

export async function GET(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const quoteIdParam = url.searchParams.get("quote_id");
  const marginRaw = url.searchParams.get("margin") ?? "0";
  const marginType = url.searchParams.get("margin_type") === "percent"
    ? "percent"
    : "fixed";
  const marginValue = Math.max(0, Number.parseFloat(marginRaw) || 0);

  const supabase = await createClient();

  const { data: request } = await supabase
    .from("quote_requests")
    .select(
      "id, code, client_name, destination, departure_date, return_date, flexible_dates, pax_adults, pax_children, pax_infants, services, notes, agency:agencies!inner(id, name, brand_color, brand_logo_url)",
    )
    .eq("id", id)
    .eq("agency_id", tenant.agencyId)
    .maybeSingle();

  if (!request) return new Response("Not found", { status: 404 });

  let quoteRow: {
    id: string;
    currency: "USD" | "ARS";
    payment_terms: string | null;
    valid_until: string | null;
    status: string;
    items: { sort_order: number; description: string; amount: number }[];
  } | null = null;

  if (quoteIdParam) {
    const { data } = await supabase
      .from("quotes")
      .select(
        "id, currency, payment_terms, valid_until, status, items:quote_items(sort_order, description, amount)",
      )
      .eq("quote_request_id", id)
      .eq("id", quoteIdParam)
      .maybeSingle();
    quoteRow = data ? { ...data, items: data.items ?? [] } : null;
  } else {
    const { data } = await supabase
      .from("quotes")
      .select(
        "id, currency, payment_terms, valid_until, status, items:quote_items(sort_order, description, amount), submitted_at",
      )
      .eq("quote_request_id", id)
      .in("status", ["accepted", "submitted"])
      .order("status", { ascending: true })
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    quoteRow = data ? { ...data, items: data.items ?? [] } : null;
  }

  if (!quoteRow) return new Response("Cotización no disponible", { status: 404 });

  const items = quoteRow.items
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({ description: i.description, amount: Number(i.amount) }));

  const subtotal = items.reduce((acc, i) => acc + i.amount, 0);
  const marginAmount =
    marginType === "percent" ? subtotal * (marginValue / 100) : marginValue;
  const total = subtotal + marginAmount;
  const marginLabel =
    marginType === "percent"
      ? `Servicios y honorarios (${marginValue.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%)`
      : "Servicios y honorarios";

  // Validar el logo antes de pasarlo al PDF: si no responde 200, omitir.
  // @react-pdf rompe el render si <Image> falla con la URL.
  let safeLogoUrl: string | null = null;
  if (request.agency.brand_logo_url) {
    try {
      const head = await fetch(request.agency.brand_logo_url, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
      });
      if (head.ok) safeLogoUrl = request.agency.brand_logo_url;
    } catch {
      // logo inaccesible — generamos PDF sin logo
    }
  }

  const buffer = await renderToBuffer(
    <QuotePdf
      agency={{
        name: request.agency.name,
        brandColor: request.agency.brand_color,
        brandLogoUrl: safeLogoUrl,
      }}
      request={{
        code: request.code,
        clientName: request.client_name,
        destination: request.destination,
        departureDate: request.departure_date,
        returnDate: request.return_date,
        flexibleDates: request.flexible_dates,
        paxAdults: request.pax_adults,
        paxChildren: request.pax_children,
        paxInfants: request.pax_infants,
        services: request.services,
        notes: request.notes,
      }}
      quote={{
        currency: quoteRow.currency,
        paymentTerms: quoteRow.payment_terms,
        validUntil: quoteRow.valid_until,
        items,
      }}
      subtotal={subtotal}
      marginAmount={marginAmount}
      marginLabel={marginLabel}
      total={total}
      generatedAt={new Date()}
    />,
  );

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="presupuesto-${request.code}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
