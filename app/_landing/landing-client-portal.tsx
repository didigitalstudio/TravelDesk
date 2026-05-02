import React from "react";
import { I } from "./landing-icons";
import { Card, Eyebrow, Section } from "./landing-primitives";

const features = [
  { i: "link" as const, t: "Link público único por viaje", d: "/trip/{token} con branding de tu agencia." },
  { i: "doc" as const, t: "Itinerario, pasajeros, reserva y documentos descargables", d: "Vos elegís cuáles compartir." },
  { i: "mail" as const, t: "Mail al cliente con el resumen del viaje", d: "Disparado automático en cada etapa." },
  { i: "pdf" as const, t: "PDF de presupuesto inline", d: `Sin attachments mal escaneados, sin "abrílo en otra app".` },
];

const timeline = ["Reservado", "Pago", "Documentos", "En vuelo"];

const files = [
  { l: "Voucher hotel — Riu Caribe", t: "PDF · 412 kb" },
  { l: "Itinerario completo", t: "PDF · 184 kb" },
  { l: "Asistencia médica", t: "PDF · 98 kb" },
];

export const LandingClientPortal = () => (
  <Section id="para-clientes">
    <Card accent style={{
      padding: "clamp(28px, 5vw, 56px)",
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 48,
      alignItems: "center",
    }}>
      <div>
        <Eyebrow>Para tu cliente final</Eyebrow>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", margin: "14px 0 20px", textWrap: "balance" }}>
          Tu cliente recibe una experiencia profesional, con tu marca.
        </h2>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
          {features.map((it, i) => (
            <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: "rgba(129,140,248,0.12)",
                border: "1px solid rgba(129,140,248,0.24)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--accent-bright)",
              }}><I name={it.i} size={15}/></div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text-1)" }}>{it.t}</div>
                <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2, textWrap: "pretty" }}>{it.d}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Client portal mockup */}
      <div style={{ position: "relative", maxWidth: 360, marginInline: "auto", width: "100%" }}>
        <div style={{
          borderRadius: 22, padding: 18,
          background: "var(--surface-1)", border: "1px solid var(--border-2)",
          boxShadow: "0 40px 80px -30px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "6px 4px 14px", borderBottom: "1px solid var(--border-1)",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, #fb923c, #f43f5e)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "white",
            }}>VR</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>ViajáRial Turismo</div>
            <div style={{ flex: 1 }}/>
            <span className="mono" style={{ fontSize: 10, color: "var(--text-3)" }}>traveldesk.com/trip/…</span>
          </div>

          <div style={{ padding: "18px 4px 8px" }}>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--accent-bright)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Tu viaje</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 6, lineHeight: 1.15 }}>
              Cancún · todo incluido
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
              12 — 22 Jul 2026 · 4 pasajeros
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "12px 0", marginTop: 4,
            borderTop: "1px solid var(--border-1)", borderBottom: "1px solid var(--border-1)",
          }}>
            {timeline.map((l, i) => (
              <React.Fragment key={l}>
                <div style={{
                  fontSize: 10.5, padding: "4px 8px", borderRadius: 999,
                  background: i <= 1 ? "rgba(52,211,153,0.14)" : "rgba(255,255,255,0.04)",
                  color: i <= 1 ? "#6ee7b7" : "var(--text-3)",
                  border: `1px solid ${i <= 1 ? "rgba(52,211,153,0.28)" : "var(--border-1)"}`,
                }}>{l}</div>
                {i < 3 && <div style={{ flex: 1, height: 1, background: "var(--border-1)" }}/>}
              </React.Fragment>
            ))}
          </div>

          <div style={{ padding: "12px 0 4px", display: "flex", flexDirection: "column", gap: 8 }}>
            {files.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-1)",
              }}>
                <I name="doc" size={14} style={{ color: "var(--text-3)" }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text-1)" }}>{f.l}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: "var(--text-3)" }}>{f.t}</div>
                </div>
                <I name="download" size={14} style={{ color: "var(--accent-bright)" }}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          position: "absolute", top: -10, right: -10,
          padding: "6px 10px", borderRadius: 8,
          background: "rgba(17,17,20,0.95)", border: "1px solid var(--border-3)",
          fontSize: 11, color: "var(--text-2)",
          boxShadow: "0 12px 30px -12px rgba(0,0,0,0.7)",
        }} className="mono">
          tu marca, no la nuestra
        </div>
      </div>
    </Card>
  </Section>
);
