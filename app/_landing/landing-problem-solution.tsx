import { I } from "./landing-icons";
import { Card, SectionHeader, Section } from "./landing-primitives";

const items = [
  {
    before: "Pedidos perdidos en mails, cotizaciones en Excel, cobros sin trazabilidad.",
    after: "Un expediente vivo por viaje, con timeline completo de cada acción.",
    icon: "inbox" as const,
  },
  {
    before: "Re-escribís los datos del cliente cada vez.",
    after: "CRM centralizado: autocompletá pasajeros y solicitudes con un click.",
    icon: "users" as const,
  },
  {
    before: "El cliente recibe el voucher por WhatsApp con un PDF mal escaneado.",
    after: "Link público con tu marca, descargas firmadas y experiencia profesional.",
    icon: "qrish" as const,
  },
];

export const LandingProblemSolution = () => (
  <Section id="producto">
    <SectionHeader
      eyebrow="El antes y el ahora"
      title="Profesionalizá lo que hoy se cae entre WhatsApp y Drive."
      sub="Travel Desk reemplaza tu workflow improvisado con un sistema diseñado para el ciclo real de un viaje."
      maxWidth={760}
    />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
      {items.map((it, i) => (
        <Card key={i} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--accent-bright)",
          }}>
            <I name={it.icon} size={18}/>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Antes</div>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.5, textWrap: "pretty" }}>{it.before}</p>
          </div>
          <div style={{ height: 1, background: "var(--border-1)" }}/>
          <div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--accent-bright)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Ahora</div>
            <p style={{ fontSize: 14, color: "var(--text-1)", lineHeight: 1.5, fontWeight: 500, textWrap: "pretty" }}>{it.after}</p>
          </div>
        </Card>
      ))}
    </div>
  </Section>
);
