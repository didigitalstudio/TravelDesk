"use client";

import { useState } from "react";
import { I } from "./landing-icons";
import { Card, SectionHeader } from "./landing-primitives";

type Mode = "agencia" | "operador";

const features: Record<Mode, Array<{ icon: Parameters<typeof I>[0]["name"]; title: string; desc: string; codeBadge?: string; snippet?: string }>> = {
  agencia: [
    {
      icon: "ticket",
      title: "Solicitudes con código único",
      codeBadge: "TD-NNNN",
      desc: "Creá un pedido, despachalo a varios operadores en un click y seguí su estado en tiempo real: borrador → enviada → cotizada → aceptada → reservada → emitida → pagada.",
    },
    {
      icon: "users",
      title: "CRM de clientes",
      desc: "Centralizá nombre, documento, vencimiento, nacionalidad y ciudad. Al crear una solicitud, autocompletá pasajeros desde el CRM en un click.",
    },
    {
      icon: "compare",
      title: "Comparador de cotizaciones",
      desc: "Recibí cotizaciones de cada operador en cards comparables (USD/ARS, tipo de cambio MEP, ítems detallados, validez). Aceptá total o parcialmente; las otras quedan rechazadas automáticamente.",
    },
    {
      icon: "pdf",
      title: "PDF de presupuesto al cliente",
      desc: "Generá un PDF branded con tu logo y color. Sumá margen por porcentaje o monto fijo — el operador nunca lo ve.",
    },
    {
      icon: "wallet",
      title: "Cuenta corriente y vencimientos BSP",
      desc: "Saldos por operador, semáforo de vencimientos según calendario IATA Argentina, KPIs de vencidos y próximos 7 días.",
    },
    {
      icon: "bot",
      title: "Bot de Telegram",
      desc: "Cargá una solicitud desde el celular en segundos. Después la completás desde la web cuando llegues a la oficina.",
      snippet: "/cotizar Cliente ; Destino ; Notas",
    },
  ],
  operador: [
    {
      icon: "inbox",
      title: "Bandeja de solicitudes",
      desc: "Recibí pedidos despachados con código, agencia, destino y fechas. El nombre del cliente solo se libera cuando la cotización es aceptada — privacidad por defecto.",
    },
    {
      icon: "currency",
      title: "Cotización en USD o ARS",
      desc: "Cargá ítems detallados, tipo de cambio MEP autollenado pero editable, validez y condiciones de pago. Reemplazá una cotización activa con una nueva en un click.",
    },
    {
      icon: "doc",
      title: "Reserva y documentación",
      desc: "Subí PNR / file / locator, voucher, factura y demás documentos. La agencia los ve y elige cuáles compartir con el cliente final.",
    },
    {
      icon: "check",
      title: "Cobros y verificación",
      desc: "Cuando la agencia sube el comprobante de pago, lo verificás y la solicitud se cierra. KPIs por agencia: pendiente, para verificar, cobrado.",
    },
    {
      icon: "brand",
      title: "Marca propia",
      desc: "Logo, color y datos de contacto que aparecen en el portal de la agencia y en los mails que reciben.",
    },
    {
      icon: "link",
      title: "Vinculación con agencias",
      desc: "Recibí invitaciones por mail, aceptalas con un click. Solo las agencias vinculadas pueden mandarte pedidos.",
    },
  ],
};

const labels: Record<Mode, { title: string; desc: string }> = {
  agencia: { title: "Para agencias", desc: "Despachá, compará, vendé." },
  operador: { title: "Para operadores", desc: "Recibí, cotizá, cerrá." },
};

export const LandingSwitchSection = () => {
  const [mode, setMode] = useState<Mode>("agencia");

  return (
    <section id="funcionalidades" style={{
      maxWidth: 1240, margin: "0 auto", padding: "72px 32px", position: "relative",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: "40px 8% 0 8%", height: 540,
        background: mode === "agencia"
          ? "radial-gradient(ellipse at 25% 30%, rgba(129,140,248,0.18), transparent 60%)"
          : "radial-gradient(ellipse at 75% 30%, rgba(192,132,252,0.18), transparent 60%)",
        transition: "background 600ms ease",
        filter: "blur(20px)", pointerEvents: "none", zIndex: 0,
      }}/>

      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeader
          eyebrow="Dos lados, un solo expediente"
          title="Una agencia y un operador trabajando en la misma pantalla."
          sub="No son dos productos: es la misma plataforma con permisos distintos. Cambiá el lado para ver lo que hace cada perfil."
          align="center"
          maxWidth={780}
        />

        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
          <div role="tablist" aria-label="Vista" style={{
            position: "relative", display: "inline-flex", padding: 5,
            background: "rgba(17,17,20,0.7)", border: "1px solid var(--border-2)",
            borderRadius: 999, gap: 4,
            boxShadow: "0 20px 40px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
            backdropFilter: "blur(8px)",
          }}>
            <span aria-hidden style={{
              position: "absolute", top: 5, bottom: 5, width: "calc(50% - 5px)",
              left: mode === "agencia" ? 5 : "calc(50% + 0px)",
              background: "linear-gradient(180deg, #a5b4fc, #818cf8)",
              borderRadius: 999,
              boxShadow: "0 8px 24px -8px rgba(129,140,248,0.55), inset 0 1px 0 rgba(255,255,255,0.4)",
              transition: "left 320ms cubic-bezier(0.65, 0, 0.35, 1)",
            }}/>
            {(["agencia", "operador"] as Mode[]).map(m => (
              <button key={m} role="tab" aria-selected={mode === m}
                onClick={() => setMode(m)}
                style={{
                  position: "relative", zIndex: 1, padding: "11px 26px",
                  fontFamily: "inherit", fontSize: 14, fontWeight: 600,
                  borderRadius: 999, border: "none", cursor: "pointer",
                  background: "transparent",
                  color: mode === m ? "#0a0a0b" : "var(--text-2)",
                  transition: "color 320ms", minWidth: 160,
                }}>
                Vista {m === "agencia" ? "Agencia" : "Operador"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 40, minHeight: 28 }}>
          <span className="mono" style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>
            {labels[mode].title} · <span style={{ color: "var(--accent-bright)" }}>{labels[mode].desc}</span>
          </span>
        </div>

        {/* Feature grid with crossfade */}
        <div style={{ position: "relative" }}>
          {(["agencia", "operador"] as Mode[]).map(m => (
            <div key={m} aria-hidden={mode !== m}
              style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16,
                opacity: mode === m ? 1 : 0,
                transform: mode === m ? "translateY(0)" : `translateY(${m === "agencia" ? -8 : 8}px)`,
                pointerEvents: mode === m ? "auto" : "none",
                position: mode === m ? "static" : "absolute",
                inset: mode === m ? "auto" : 0,
                transition: "opacity 360ms ease, transform 360ms ease",
              }}>
              {features[m].map((f, i) => (
                <Card key={i} style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, transition: "all 220ms ease" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(129,140,248,0.25)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-1)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "linear-gradient(180deg, rgba(129,140,248,0.18), rgba(129,140,248,0.06))",
                      border: "1px solid rgba(129,140,248,0.28)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--accent-bright)",
                    }}>
                      <I name={f.icon} size={17}/>
                    </div>
                    {f.codeBadge && (
                      <span className="mono" style={{
                        fontSize: 10.5, color: "var(--accent-bright)",
                        padding: "3px 8px", borderRadius: 6,
                        background: "rgba(129,140,248,0.1)",
                        border: "1px solid rgba(129,140,248,0.22)",
                      }}>{f.codeBadge}</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 15.5, lineHeight: 1.25 }}>{f.title}</h3>
                  <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5, textWrap: "pretty", flex: 1 }}>
                    {f.desc}
                  </p>
                  {f.snippet && (
                    <div className="mono" style={{
                      padding: "8px 10px", borderRadius: 8, fontSize: 11.5,
                      background: "rgba(0,0,0,0.4)", border: "1px solid var(--border-1)",
                      color: "var(--text-2)",
                    }}>
                      <span style={{ color: "var(--accent-bright)" }}>{f.snippet.split(" ")[0]}</span>
                      <span>{f.snippet.slice(f.snippet.indexOf(" "))}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 32, padding: "14px 20px",
          borderRadius: 999, background: "rgba(255,255,255,0.025)",
          border: "1px solid var(--border-1)", maxWidth: 700, marginInline: "auto",
          textAlign: "center", fontSize: 13.5, color: "var(--text-2)",
        }}>
          <I name="link" size={14} style={{ verticalAlign: "-3px", color: "var(--accent-bright)", marginRight: 8 }}/>
          La misma solicitud, los mismos campos, los mismos archivos — vistos desde cada lado.
        </div>
      </div>
    </section>
  );
};
