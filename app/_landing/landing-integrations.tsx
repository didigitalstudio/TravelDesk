import { I } from "./landing-icons";
import { Card, Pill, SectionHeader, Section } from "./landing-primitives";

const items = [
  {
    name: "Google Drive",
    d: "Sincronizá el expediente a tu Drive personal con un click.",
    logo: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 4h6l6 10-3 6H6l-3-6L9 4Z"/><path d="M9 4l6 10M21 14H9M3 14l6-10"/>
      </svg>
    ),
    tint: "rgba(251,191,36,0.14)", tintBorder: "rgba(251,191,36,0.3)", tintFg: "#fcd34d",
  },
  {
    name: "Telegram",
    d: "Bot oficial para cargar solicitudes desde el celular.",
    logo: <I name="send" size={20}/>,
    tint: "rgba(96,165,250,0.14)", tintBorder: "rgba(96,165,250,0.3)", tintFg: "#93c5fd",
  },
  {
    name: "Resend",
    d: "Mails transaccionales con tu marca, entregabilidad y métricas.",
    logo: <I name="mail" size={20}/>,
    tint: "rgba(192,132,252,0.14)", tintBorder: "rgba(192,132,252,0.3)", tintFg: "#ddd6fe",
  },
];

export const LandingIntegrations = () => (
  <Section>
    <SectionHeader
      eyebrow="Integraciones"
      title="Lo que ya usás, conectado de fábrica."
      maxWidth={680}
    />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
      {items.map((it, i) => (
        <Card key={i} style={{ padding: 22, display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: it.tint, border: `1px solid ${it.tintBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: it.tintFg,
          }}>{it.logo}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{it.name}</div>
              <Pill tone="success" dot>activo</Pill>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, textWrap: "pretty" }}>{it.d}</div>
          </div>
        </Card>
      ))}
    </div>
  </Section>
);
