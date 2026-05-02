import { I } from "./landing-icons";
import { Card, Eyebrow, Pill, Section } from "./landing-primitives";

const steps = [
  { dir: "r", label: "Solicitud", tone: "indigo" as const },
  { dir: "l", label: "Cotización", tone: "success" as const },
  { dir: "r", label: "Aceptación", tone: "success" as const },
  { dir: "l", label: "Reserva", tone: "violet" as const },
  { dir: "l", label: "Documentos", tone: "violet" as const },
  { dir: "r", label: "Pago", tone: "warning" as const },
  { dir: "l", label: "Verificado", tone: "success" as const },
];

export const LandingConnected = () => (
  <Section>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 56, alignItems: "center", position: "relative" }}>
      <svg aria-hidden viewBox="0 0 600 400" style={{
        position: "absolute", inset: "-40px -40px auto auto", width: 380, height: 260,
        opacity: 0.18, pointerEvents: "none", zIndex: 0,
      }}>
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5b4fc"/>
            <stop offset="100%" stopColor="#c084fc"/>
          </linearGradient>
        </defs>
        <path d="M40,320 C 180,260 220,140 360,120 C 460,108 520,80 560,40"
          fill="none" stroke="url(#routeGrad)" strokeWidth="1.4" strokeDasharray="4 6"/>
        <circle cx="40" cy="320" r="4" fill="#a5b4fc"/>
        <circle cx="560" cy="40" r="4" fill="#c084fc"/>
        <g transform="translate(360 110) rotate(-22)">
          <path d="M-12,0 L8,-3 L14,-8 L18,-6 L14,-1 L20,2 L18,4 L8,3 L-12,5 Z" fill="#a5b4fc"/>
        </g>
      </svg>

      <div>
        <Eyebrow>Conectados, en tiempo real</Eyebrow>
        <h2 style={{ fontSize: "clamp(28px, 4.2vw, 44px)", margin: "14px 0 18px", textWrap: "balance" }}>
          Cada acción de un lado dispara una notificación, un mail y un cambio de estado del otro.
        </h2>
        <p style={{ fontSize: 17, color: "var(--text-2)", lineHeight: 1.55, textWrap: "pretty", marginBottom: 22 }}>
          Sin reenviar mensajes. Sin copiar datos. Sin esa pregunta de WhatsApp a las 11 de la noche
          preguntando "¿llegó mi mail?".
        </p>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            "Notificaciones in-app con un solo clic al expediente.",
            "Mails transaccionales con la marca de cada lado.",
            "Estado del expediente sincronizado para los dos perfiles.",
          ].map((t, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: "var(--text-2)" }}>
              <I name="check" size={17} style={{ color: "var(--accent-bright)", marginTop: 1, flexShrink: 0 }}/>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <Card style={{ padding: "28px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: 22, gap: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, marginInline: "auto",
              background: "linear-gradient(180deg, rgba(129,140,248,0.2), rgba(129,140,248,0.05))",
              border: "1px solid rgba(129,140,248,0.32)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--accent-bright)",
            }}><I name="suitcase" size={22}/></div>
            <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 600 }}>Agencia</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }}>Vende</div>
          </div>
          <div style={{ width: 1, height: 80, background: "var(--border-1)" }}/>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, marginInline: "auto",
              background: "linear-gradient(180deg, rgba(192,132,252,0.2), rgba(192,132,252,0.05))",
              border: "1px solid rgba(192,132,252,0.32)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#ddd6fe",
            }}><I name="plane" size={22}/></div>
            <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 600 }}>Operador</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }}>Opera</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 200px 1fr",
              alignItems: "center", gap: 8, padding: "6px 0",
            }}>
              <div style={{ height: 1, background: s.dir === "r" ? "rgba(129,140,248,0.18)" : "transparent" }}/>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {s.dir === "l" && <I name="arrowRight" size={13} style={{ transform: "rotate(180deg)", color: "var(--text-3)" }}/>}
                <Pill tone={s.tone} dot>{s.label}</Pill>
                {s.dir === "r" && <I name="arrowRight" size={13} style={{ color: "var(--text-3)" }}/>}
              </div>
              <div style={{ height: 1, background: s.dir === "l" ? "rgba(192,132,252,0.18)" : "transparent" }}/>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border-1)",
          display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12,
        }}>
          <span style={{ color: "var(--text-3)" }} className="mono">EXPEDIENTE TD-0042</span>
          <span style={{ color: "var(--success)" }} className="mono">● sincronizado</span>
        </div>
      </Card>
    </div>
  </Section>
);
