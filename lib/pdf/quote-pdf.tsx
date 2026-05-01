import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { formatMoney, type Currency } from "@/lib/requests";

export type QuotePdfProps = {
  agency: {
    name: string;
    brandColor: string | null;
    brandLogoUrl: string | null;
  };
  request: {
    code: string;
    clientName: string;
    destination: string;
    departureDate: string | null;
    returnDate: string | null;
    flexibleDates: boolean;
    paxAdults: number;
    paxChildren: number;
    paxInfants: number;
    services: string[];
    notes: string | null;
  };
  quote: {
    currency: Currency;
    paymentTerms: string | null;
    validUntil: string | null;
    items: { description: string; amount: number }[];
  };
  subtotal: number;
  marginAmount: number;
  marginLabel: string;
  total: number;
  generatedAt: Date;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0F172A",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  agencyName: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  meta: { textAlign: "right", fontSize: 9, color: "#64748B" },
  metaCode: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#64748B",
    marginBottom: 6,
  },
  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  detailRow: { marginBottom: 4 },
  detailLabel: {
    fontSize: 8,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: { fontSize: 10, marginTop: 1 },
  itemsHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "#CBD5E1",
  },
  itemsHeaderCellDesc: { flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold", color: "#475569" },
  itemsHeaderCellAmount: {
    width: 110,
    textAlign: "right",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderColor: "#E2E8F0",
  },
  itemDesc: { flex: 1, fontSize: 10 },
  itemAmount: { width: 110, textAlign: "right", fontSize: 10, fontFamily: "Helvetica" },
  totalsBox: {
    marginTop: 12,
    alignSelf: "flex-end",
    width: 240,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: { fontSize: 10, color: "#475569" },
  totalValue: { fontSize: 10, fontFamily: "Helvetica" },
  grandTotal: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  grandTotalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  grandTotalValue: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  notesBox: {
    marginTop: 18,
    padding: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 4,
    borderLeftWidth: 3,
    borderColor: "#CBD5E1",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 8,
    color: "#94A3B8",
  },
  logo: { width: 48, height: 48, objectFit: "contain" },
});

const SERVICE_LABELS_PDF: Record<string, string> = {
  flights: "Vuelos",
  hotel: "Hotel",
  transfers: "Transfers",
  excursions: "Excursiones",
  package: "Paquete completo",
  cruise: "Crucero",
  insurance: "Asistencia / Seguro",
  other: "Otros",
};

function formatPaxBreakdown(a: number, c: number, i: number): string {
  const parts: string[] = [];
  if (a) parts.push(`${a} adulto${a === 1 ? "" : "s"}`);
  if (c) parts.push(`${c} menor${c === 1 ? "" : "es"}`);
  if (i) parts.push(`${i} infante${i === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" · ") : "—";
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR");
}

function formatDateRange(
  from: string | null,
  to: string | null,
  flexible: boolean,
): string {
  if (flexible && !from && !to) return "Flexibles";
  if (from && to) return `${formatDate(from)} → ${formatDate(to)}${flexible ? " (flex)" : ""}`;
  if (from) return `${formatDate(from)}${flexible ? " (flex)" : ""}`;
  if (to) return `→ ${formatDate(to)}${flexible ? " (flex)" : ""}`;
  return flexible ? "Flexibles" : "—";
}

export function QuotePdf({
  agency,
  request,
  quote,
  subtotal,
  marginAmount,
  marginLabel,
  total,
  generatedAt,
}: QuotePdfProps) {
  const accent = agency.brandColor || "#0F172A";
  return (
    <Document title={`Presupuesto ${request.code}`} author={agency.name}>
      <Page size="A4" style={styles.page}>
        <View style={[styles.header, { borderColor: accent }]}>
          <View style={styles.headerLeft}>
            {agency.brandLogoUrl ? (
              <Image src={agency.brandLogoUrl} style={styles.logo} />
            ) : null}
            <Text style={[styles.agencyName, { color: accent }]}>
              {agency.name}
            </Text>
          </View>
          <View>
            <Text style={styles.metaCode}>{request.code}</Text>
            <Text style={styles.meta}>
              Emitido {generatedAt.toLocaleDateString("es-AR")}
            </Text>
            {quote.validUntil && (
              <Text style={styles.meta}>
                Válido hasta {formatDate(quote.validUntil)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Text style={styles.detailValue}>{request.clientName}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Destino</Text>
              <Text style={styles.detailValue}>{request.destination}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Fechas</Text>
              <Text style={styles.detailValue}>
                {formatDateRange(
                  request.departureDate,
                  request.returnDate,
                  request.flexibleDates,
                )}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Pasajeros</Text>
              <Text style={styles.detailValue}>
                {formatPaxBreakdown(
                  request.paxAdults,
                  request.paxChildren,
                  request.paxInfants,
                )}
              </Text>
            </View>
          </View>
        </View>

        {request.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servicios incluidos</Text>
            <Text style={styles.detailValue}>
              {request.services.map((s) => SERVICE_LABELS_PDF[s] ?? s).join(" · ")}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle</Text>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsHeaderCellDesc}>Concepto</Text>
            <Text style={styles.itemsHeaderCellAmount}>Importe</Text>
          </View>
          {quote.items.length === 0 ? (
            <View style={styles.itemRow}>
              <Text style={styles.itemDesc}>Servicio integral</Text>
              <Text style={styles.itemAmount}>
                {formatMoney(subtotal, quote.currency)}
              </Text>
            </View>
          ) : (
            quote.items.map((it, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemDesc}>{it.description}</Text>
                <Text style={styles.itemAmount}>
                  {formatMoney(it.amount, quote.currency)}
                </Text>
              </View>
            ))
          )}

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatMoney(subtotal, quote.currency)}
              </Text>
            </View>
            {marginAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{marginLabel}</Text>
                <Text style={styles.totalValue}>
                  {formatMoney(marginAmount, quote.currency)}
                </Text>
              </View>
            )}
            <View style={[styles.grandTotal, { borderColor: accent }]}>
              <Text style={[styles.grandTotalLabel, { color: accent }]}>Total</Text>
              <Text style={[styles.grandTotalValue, { color: accent }]}>
                {formatMoney(total, quote.currency)}
              </Text>
            </View>
          </View>
        </View>

        {quote.paymentTerms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Condiciones de pago</Text>
            <Text style={styles.detailValue}>{quote.paymentTerms}</Text>
          </View>
        )}

        {request.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.detailValue}>{request.notes}</Text>
          </View>
        )}

        <Text style={styles.footer} fixed>
          Presupuesto generado por {agency.name} · {request.code}
        </Text>
      </Page>
    </Document>
  );
}
