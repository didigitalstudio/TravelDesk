import { I } from "./landing-icons";
import { BrandMark, Pill } from "./landing-primitives";

const requests = [
  { id: "TD-0042", client: "Familia Rial — 4 pax", dest: "EZE → CUN", dates: "12–22 Jul", op: "OLA Mayorista", status: "cotizada", tone: "indigo" as const },
  { id: "TD-0043", client: "C. Almeida + 1", dest: "EZE → MAD → LIS", dates: "04–18 Sep", op: "Eurovips", status: "aceptada", tone: "success" as const },
  { id: "TD-0044", client: "Empresa Lemma SRL", dest: "EZE → JFK", dates: "02–06 Jun", op: "Despachada (3)", status: "enviada", tone: "warning" as const },
  { id: "TD-0045", client: "M. Iturri — 2 pax", dest: "AEP → GIG", dates: "20–27 May", op: "Tije", status: "reservada", tone: "violet" as const },
  { id: "TD-0046", client: "Borrador", dest: "AEP → BRC", dates: "—", op: "—", status: "borrador", tone: "neutral" as const },
];

const Sidebar = () => (
  <div style={{
    width: 200, padding: 14, borderRight: "1px solid var(--border-1)",
    display: "flex", flexDirection: "column", gap: 4,
    background: "rgba(255,255,255,0.015)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 14px" }}>
      <BrandMark size={24} />
      <div style={{ fontSize: 13, fontWeight: 600 }}>Travel Desk</div>
    </div>
    {[
      { l: "Solicitudes", i: "inbox" as const, active: true, n: "12" },
      { l: "Clientes", i: "users" as const },
      { l: "Operadores", i: "building" as const },
      { l: "Cuenta corriente", i: "wallet" as const },
      { l: "Configuración", i: "brand" as const },
    ].map((it, i) => (
      <div key={i} style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 8,
        background: it.active ? "rgba(255,255,255,0.06)" : "transparent",
        color: it.active ? "var(--text-1)" : "var(--text-3)",
        fontSize: 12.5, fontWeight: 500, position: "relative",
      }}>
        {it.active && <span style={{
          position: "absolute", left: -1, top: 6, bottom: 6, width: 2,
          background: "var(--accent-bright)", borderRadius: 2,
        }}/>}
        <I name={it.i} size={14} style={{ opacity: it.active ? 1 : 0.7 }} />
        <span style={{ flex: 1 }}>{it.l}</span>
        {it.n && <span className="mono" style={{ fontSize: 10.5, color: "var(--text-3)" }}>{it.n}</span>}
      </div>
    ))}
    <div style={{ flex: 1 }}/>
    <div style={{
      padding: 10, borderRadius: 10, background: "rgba(129,140,248,0.06)",
      border: "1px solid rgba(129,140,248,0.18)", fontSize: 11, color: "var(--text-2)",
    }}>
      <div className="mono" style={{ color: "var(--accent-bright)", fontSize: 10, marginBottom: 4 }}>BSP · ARG</div>
      Próximo vencimiento <strong style={{ color: "var(--text-1)" }}>15 May</strong>
    </div>
  </div>
);

const Topbar = () => (
  <div style={{
    height: 48, display: "flex", alignItems: "center",
    padding: "0 16px", gap: 12, borderBottom: "1px solid var(--border-1)",
  }}>
    <div style={{
      flex: 1, maxWidth: 280, display: "flex", alignItems: "center", gap: 8,
      padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)",
      border: "1px solid var(--border-1)",
    }}>
      <I name="search" size={13} style={{ color: "var(--text-3)" }}/>
      <span style={{ fontSize: 12, color: "var(--text-3)" }}>Buscar TD-…, cliente, destino</span>
    </div>
    <div style={{ flex: 1 }}/>
    <I name="bell" size={15} style={{ color: "var(--text-3)" }}/>
    <div style={{
      width: 24, height: 24, borderRadius: 999,
      background: "linear-gradient(135deg, #34d399, #10b981)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10.5, fontWeight: 600, color: "#052e1a",
    }}>SR</div>
  </div>
);

const KPI = ({ label, value, delta, tone = "indigo" }: {
  label: string; value: string; delta?: string; tone?: "indigo" | "success" | "danger";
}) => (
  <div style={{
    flex: 1, padding: 14, borderRadius: 12,
    background: "rgba(255,255,255,0.025)", border: "1px solid var(--border-1)",
  }}>
    <div style={{ fontSize: 10.5, color: "var(--text-3)", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
    <div className="mono" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>{value}</div>
    {delta && (
      <div style={{ fontSize: 11, marginTop: 4 }}>
        <span style={{ color: tone === "success" ? "var(--success)" : tone === "danger" ? "var(--danger)" : "var(--accent-bright)" }} className="mono">{delta}</span>
        <span style={{ color: "var(--text-3)", marginLeft: 4 }}>vs. semana ant.</span>
      </div>
    )}
  </div>
);

export const DashboardMockup = () => (
  <div style={{
    borderRadius: 18, overflow: "hidden",
    border: "1px solid var(--border-2)",
    background: "var(--surface-1)",
    boxShadow: "0 60px 120px -40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.02), 0 30px 80px -30px rgba(129,140,248,0.25)",
  }}>
    {/* window chrome */}
    <div style={{
      height: 28, display: "flex", alignItems: "center", gap: 6,
      padding: "0 12px", background: "rgba(255,255,255,0.02)",
      borderBottom: "1px solid var(--border-1)",
    }}>
      {["#ff5f57", "#febc2e", "#28c840"].map(c => (
        <span key={c} style={{ width: 10, height: 10, borderRadius: 999, background: c, opacity: 0.65 }}/>
      ))}
      <div style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--text-3)" }} className="mono">
        app.traveldesk.com / solicitudes
      </div>
    </div>

    <div style={{ display: "flex", minHeight: 480 }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar />
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Solicitudes</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>12 activas · 3 esperando aceptación</div>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px",
              borderRadius: 8, background: "linear-gradient(180deg,#a5b4fc,#818cf8)", color: "#0a0a0b",
              fontSize: 12, fontWeight: 600,
            }}>
              <I name="plus" size={13}/> Nueva solicitud
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <KPI label="Activas" value="12" delta="+3"/>
            <KPI label="Por aceptar" value="3" delta="+1" tone="success"/>
            <KPI label="Vencen 7d" value="USD 8.420" delta="2 ops" tone="danger"/>
          </div>

          <div style={{ borderRadius: 12, border: "1px solid var(--border-1)", background: "rgba(255,255,255,0.015)", overflow: "hidden" }}>
            <div className="mono" style={{
              display: "grid", gridTemplateColumns: "90px 1.6fr 1.2fr 0.9fr 1.1fr 110px",
              padding: "9px 14px", fontSize: 10, color: "var(--text-3)",
              letterSpacing: "0.06em", textTransform: "uppercase",
              borderBottom: "1px solid var(--border-1)",
            }}>
              <div>Código</div><div>Cliente</div><div>Destino</div><div>Fechas</div><div>Operador</div><div>Estado</div>
            </div>
            {requests.map((r, i) => (
              <div key={r.id} style={{
                display: "grid", gridTemplateColumns: "90px 1.6fr 1.2fr 0.9fr 1.1fr 110px",
                padding: "11px 14px", fontSize: 12.5, alignItems: "center",
                borderBottom: i < requests.length - 1 ? "1px solid var(--border-1)" : "none",
              }}>
                <div className="mono" style={{ color: "var(--accent-bright)" }}>{r.id}</div>
                <div style={{ color: "var(--text-1)" }}>{r.client}</div>
                <div style={{ color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
                  <I name="plane" size={11} style={{ color: "var(--text-3)" }}/>
                  <span className="mono" style={{ fontSize: 11.5 }}>{r.dest}</span>
                </div>
                <div className="mono" style={{ color: "var(--text-2)", fontSize: 11.5 }}>{r.dates}</div>
                <div style={{ color: "var(--text-2)" }}>{r.op}</div>
                <div><Pill tone={r.tone} dot>{r.status}</Pill></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
