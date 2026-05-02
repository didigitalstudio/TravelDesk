import { I } from "./landing-icons";
import { Card, SectionHeader, Section } from "./landing-primitives";

const items = [
  { i: "shield" as const, t: "Aislamiento por tenant", d: "RLS de Postgres a nivel de fila — los datos de cada cuenta nunca se cruzan." },
  { i: "doc" as const,    t: "Storage privado con signed URLs", d: "Documentos detrás de URLs firmadas con expiración corta." },
  { i: "globe" as const,  t: "Vercel + Supabase", d: "Infraestructura serverless, escalable y observada 24/7." },
  { i: "download" as const, t: "Tus datos son tuyos", d: "Export disponible en cualquier momento. Sin candados." },
];

export const LandingSecurity = () => (
  <Section>
    <SectionHeader
      eyebrow="Seguridad y datos"
      title="Construido como un sistema de producción, no como una hoja de Excel."
      maxWidth={760}
    />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
      {items.map((it, i) => (
        <Card key={i} style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--accent-bright)",
          }}>
            <I name={it.i} size={16}/>
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 6, letterSpacing: "-0.01em" }}>{it.t}</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, textWrap: "pretty" }}>{it.d}</div>
          </div>
        </Card>
      ))}
    </div>
  </Section>
);
