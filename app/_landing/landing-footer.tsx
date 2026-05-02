import { Wordmark } from "./landing-primitives";

const footLink: React.CSSProperties = { color: "var(--text-2)", textDecoration: "none" };

export const LandingFooter = () => {
  const year = new Date().getFullYear();
  return (
    <footer style={{
      borderTop: "1px solid var(--border-1)",
      padding: "48px 32px 36px",
      maxWidth: 1240, margin: "0 auto",
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32,
        alignItems: "flex-start",
      }}>
        <div>
          <Wordmark size={28}/>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 14, maxWidth: 320, lineHeight: 1.55 }}>
            El back office compartido para agencias y operadores. Hecho en Argentina.
          </p>
        </div>

        <div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Producto</div>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 }}>
            <li><a href="#funcionalidades" style={footLink}>Funcionalidades</a></li>
            <li><a href="#para-clientes" style={footLink}>Para clientes</a></li>
            <li><a href="#demo" style={footLink}>Demo</a></li>
            <li><a href="https://traveldesk-two.vercel.app/login" style={footLink}>Iniciar sesión</a></li>
          </ul>
        </div>

        <div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Contacto</div>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 }}>
            <li><a href="mailto:info@didigitalstudio.com" style={footLink}>info@didigitalstudio.com</a></li>
            <li><a href="https://didigitalstudio.com" target="_blank" rel="noreferrer" style={footLink}>didigitalstudio.com</a></li>
          </ul>
        </div>

        <div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Legal</div>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 }}>
            <li><a href="/terms" style={footLink}>Términos</a></li>
            <li><a href="/privacy" style={footLink}>Privacidad</a></li>
          </ul>
        </div>
      </div>

      <div style={{
        marginTop: 40, paddingTop: 22, borderTop: "1px solid var(--border-1)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>
          Travel Desk — Desarrollado por{" "}
          <a href="https://didigitalstudio.com" target="_blank" rel="noreferrer" style={{ color: "var(--text-2)", textDecoration: "none", borderBottom: "1px dashed var(--border-3)" }}>
            DI Digital Studio
          </a>.
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: "var(--text-4)" }}>© {year} · v1.0</div>
      </div>
    </footer>
  );
};
