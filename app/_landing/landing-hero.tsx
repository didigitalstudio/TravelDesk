import { I } from "./landing-icons";
import { Button, Pill } from "./landing-primitives";
import { DashboardMockup } from "./dashboard-mockup";

export const LandingHero = () => (
  <section id="top" style={{
    maxWidth: 1240, margin: "0 auto", padding: "130px 32px 56px",
    position: "relative",
  }}>
    {/* Decorative route arc */}
    <svg aria-hidden viewBox="0 0 1200 400" style={{
      position: "absolute", top: 120, left: 0, right: 0, width: "100%", height: 360,
      opacity: 0.22, pointerEvents: "none", zIndex: 0,
    }}>
      <defs>
        <linearGradient id="heroRoute" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0"/>
          <stop offset="40%" stopColor="#a5b4fc" stopOpacity="1"/>
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d="M-20,340 C 240,280 420,160 720,140 C 940,126 1080,90 1240,40"
        fill="none" stroke="url(#heroRoute)" strokeWidth="1.2" strokeDasharray="3 7"/>
      <g transform="translate(720 140) rotate(-12)">
        <path d="M-14,0 L9,-3 L16,-9 L20,-7 L16,-1 L22,2 L20,5 L9,4 L-14,6 Z" fill="#c7d2fe" opacity="0.9"/>
      </g>
    </svg>

    <div style={{
      display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)",
      gap: 56, position: "relative", zIndex: 1, alignItems: "center",
    }}>
      <div style={{ maxWidth: 880 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
          <Pill tone="indigo" dot>v1.0 · Argentina y LatAm</Pill>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-3)" }}>
            <I name="plane" size={14} style={{ color: "var(--accent-bright)" }}/>
            Agencias de viaje minoristas + operadores mayoristas
          </span>
        </div>

        <h1 style={{ fontSize: "clamp(40px, 6.5vw, 76px)", marginBottom: 24, textWrap: "balance" }}>
          La plataforma que las agencias
          <br/>
          <span style={{
            backgroundImage: "linear-gradient(95deg, #a5b4fc 0%, #c084fc 60%, #a5b4fc 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>y los operadores comparten.</span>
        </h1>

        <p style={{
          fontSize: "clamp(17px, 1.6vw, 20px)", lineHeight: 1.5,
          color: "var(--text-2)", maxWidth: 640, marginBottom: 36, textWrap: "pretty",
        }}>
          <strong style={{ color: "var(--text-1)", fontWeight: 500 }}>TravelDesk</strong> es la plataforma
          para agencias minoristas y operadores mayoristas que reemplaza los mails, WhatsApps, Excels y
          carpetas sueltas de Drive por un único expediente vivo por viaje — desde la cotización hasta
          la verificación del pago.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            size="lg"
            as="a"
            href="#demo"
            iconRight={<I name="arrowRight" size={15} style={{ marginLeft: 4 }}/>}
          >
            Solicitar demo
          </Button>
          <Button size="lg" variant="ghost" as="a" href="#funcionalidades">
            Ver cómo funciona
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8, color: "var(--text-3)", fontSize: 13 }}>
            <I name="check" size={14} style={{ color: "var(--success)" }}/>
            <span>Sin tarjeta · 14 días free</span>
          </div>
        </div>
      </div>

      {/* Globe artwork */}
      <div aria-hidden style={{
        position: "relative", minHeight: 360,
        display: "flex", alignItems: "center", justifyContent: "center",
      }} className="td-hero-art">
        <svg viewBox="0 0 480 480" style={{ width: "100%", maxWidth: 460, height: "auto" }}>
          <defs>
            <radialGradient id="globeFill" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#1c1c22" stopOpacity="1"/>
              <stop offset="60%" stopColor="#111114" stopOpacity="1"/>
              <stop offset="100%" stopColor="#0a0a0b" stopOpacity="1"/>
            </radialGradient>
            <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.35"/>
              <stop offset="60%" stopColor="#a5b4fc" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a5b4fc"/>
              <stop offset="100%" stopColor="#c084fc"/>
            </linearGradient>
            <linearGradient id="meridian" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.0"/>
              <stop offset="50%" stopColor="#a5b4fc" stopOpacity="0.55"/>
              <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.0"/>
            </linearGradient>
          </defs>
          <circle cx="240" cy="240" r="220" fill="url(#globeGlow)"/>
          <ellipse cx="240" cy="240" rx="210" ry="58" fill="none"
            stroke="url(#ringGrad)" strokeWidth="0.8" strokeDasharray="3 6" opacity="0.35"
            transform="rotate(-18 240 240)"/>
          <circle cx="240" cy="240" r="160" fill="url(#globeFill)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
          {[0,1,2,3,4].map(i => {
            const rx = 160 - i * 32;
            return <ellipse key={i} cx="240" cy="240" rx={Math.max(8, rx)} ry="160"
              fill="none" stroke="url(#meridian)" strokeWidth="0.7" opacity={0.55 - i * 0.08}/>;
          })}
          {[-110,-55,0,55,110].map((y, i) => {
            const ry = Math.sqrt(Math.max(1, 160*160 - y*y));
            return <ellipse key={i} cx="240" cy={240+y} rx={ry} ry={Math.max(2, 14 - Math.abs(y)/12)}
              fill="none" stroke="rgba(165,180,252,0.25)" strokeWidth="0.7"/>;
          })}
          <g fill="#a5b4fc" opacity="0.7">
            {[
              [200,180],[210,185],[220,180],[218,190],[208,195],[195,200],[225,200],[235,205],
              [245,195],[255,200],[260,210],[245,215],[230,215],[240,225],[252,228],
              [180,225],[190,232],[200,238],[210,242],[225,245],[240,250],[252,255],[265,250],[275,242],
              [195,260],[205,265],[215,270],[225,275],[235,275],[245,272],[255,268],
              [200,290],[212,295],[224,298],[236,295],[248,290],[258,283],
              [275,210],[285,215],[290,225],[295,235],
            ].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="1.8"/>)}
          </g>
          <path d="M 100 300 Q 240 80 380 200" fill="none"
            stroke="url(#ringGrad)" strokeWidth="1.4" strokeDasharray="4 5"/>
          <circle cx="100" cy="300" r="4" fill="#a5b4fc"/>
          <circle cx="380" cy="200" r="4" fill="#c084fc"/>
          <g transform="translate(240 110) rotate(28)">
            <path d="M-12,0 L8,-3 L14,-8 L18,-6 L14,-1 L20,2 L18,4 L8,3 L-12,5 Z" fill="#c7d2fe"/>
          </g>
          <path d="M 130 380 Q 380 360 420 250" fill="none"
            stroke="rgba(192,132,252,0.5)" strokeWidth="1" strokeDasharray="2 6"/>
          <circle cx="130" cy="380" r="3" fill="#c084fc" opacity="0.7"/>
          <circle cx="420" cy="250" r="3" fill="#c084fc" opacity="0.7"/>
          <g fontFamily="Space Mono, ui-monospace, monospace" fontSize="10" fill="#75757f" letterSpacing="1">
            <text x="92" y="294">EZE</text>
            <text x="378" y="194">MAD</text>
            <text x="118" y="396">GIG</text>
            <text x="424" y="246">JFK</text>
          </g>
          <circle cx="240" cy="240" r="200" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        </svg>

        <div style={{
          position: "absolute", left: "4%", bottom: "8%",
          padding: "8px 12px", borderRadius: 10,
          background: "rgba(17,17,20,0.85)", border: "1px solid var(--border-2)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 12px 30px -16px rgba(0,0,0,0.7)",
        }} className="mono">
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--success)" }}/>
          <span style={{ fontSize: 11, color: "var(--text-2)" }}>AR1304 · en vuelo</span>
        </div>

        <div style={{
          position: "absolute", right: "0%", top: "6%",
          padding: "6px 11px", borderRadius: 999,
          background: "rgba(17,17,20,0.85)", border: "1px solid var(--border-2)",
          backdropFilter: "blur(8px)", fontSize: 11, color: "var(--text-2)",
        }} className="mono">BSP · IATA ARG</div>
      </div>
    </div>

    <div style={{ position: "relative", marginTop: 72, zIndex: 1 }}>
      <DashboardMockup />
    </div>

    <div className="mono" style={{
      marginTop: 14, fontSize: 11, color: "var(--text-4)", textAlign: "center", letterSpacing: "0.05em",
    }}>
      Vista representativa del producto · datos ilustrativos
    </div>

    <style>{`
      @media (max-width: 880px) { .td-hero-art { display: none; } }
    `}</style>
  </section>
);
