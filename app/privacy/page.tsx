import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <div className="td-landing" style={{ minHeight: "100vh" }}>
      <header style={{
        borderBottom: "1px solid var(--border-1)",
        padding: "18px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, #a5b4fc 0%, #818cf8 50%, #c084fc 100%)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: "#0a0a0b", fontWeight: 700, fontSize: 12, letterSpacing: "-0.02em",
            }}>TD</div>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em" }}>Travel Desk</span>
          </div>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none" }}>
          ← Volver al inicio
        </Link>
      </header>

      <main style={{ maxWidth: 740, margin: "0 auto", padding: "64px 32px 96px" }}>
        <div style={{ marginBottom: 48 }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--accent-bright)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>Legal</div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", marginBottom: 12 }}>Política de privacidad</h1>
          <p style={{ fontSize: 13.5, color: "var(--text-3)" }}>Última actualización: mayo de 2026</p>
        </div>

        <LegalSection title="1. Responsable del tratamiento">
          DI Digital Studio (en adelante, "nosotros") es el responsable del tratamiento de los datos personales
          recolectados a través de Travel Desk, con domicilio digital en{" "}
          <a href="https://didigitalstudio.com" target="_blank" rel="noreferrer" style={{ color: "var(--accent-bright)", textDecoration: "none", borderBottom: "1px dashed rgba(165,180,252,0.4)" }}>
            didigitalstudio.com
          </a>.
        </LegalSection>

        <LegalSection title="2. Datos que recolectamos">
          Recolectamos los datos que vos y tu organización cargan en la plataforma: nombre, email, teléfono,
          datos de documentos de viaje y archivos adjuntos (pasaportes, vouchers, comprobantes). También
          recolectamos datos técnicos de uso: dirección IP, tipo de navegador y páginas visitadas, con fines
          de diagnóstico y mejora del Servicio.
        </LegalSection>

        <LegalSection title="3. Finalidad del tratamiento">
          Utilizamos tus datos exclusivamente para: (a) proveer y mejorar el Servicio, (b) enviarte
          notificaciones transaccionales relacionadas con tu actividad en la plataforma, y (c) responder
          consultas de soporte. No utilizamos tus datos con fines publicitarios ni los cedemos a terceros
          con ese fin.
        </LegalSection>

        <LegalSection title="4. Almacenamiento y seguridad">
          Los datos se almacenan en Supabase (región sa-east-1, Brasil) con aislamiento por tenant mediante
          Row Level Security de PostgreSQL. Los documentos se guardan en storage privado con URLs firmadas
          de corta duración. Ningún archivo es públicamente accesible sin autorización.
        </LegalSection>

        <LegalSection title="5. Cookies">
          Utilizamos únicamente las cookies de sesión estrictamente necesarias para mantener tu autenticación
          en la plataforma. No usamos cookies de rastreo ni de publicidad de terceros.
        </LegalSection>

        <LegalSection title="6. Tus derechos">
          Tenés derecho a acceder, rectificar, eliminar o exportar tus datos en cualquier momento. Para
          ejercerlos, escribinos a{" "}
          <a href="mailto:info@didigitalstudio.com" style={{ color: "var(--accent-bright)", textDecoration: "none", borderBottom: "1px dashed rgba(165,180,252,0.4)" }}>
            info@didigitalstudio.com
          </a>{" "}
          y respondemos en un plazo de 15 días hábiles.
        </LegalSection>

        <LegalSection title="7. Integraciones de terceros">
          Travel Desk se integra con servicios de terceros que tienen sus propias políticas de privacidad:
          Supabase (base de datos y auth), Resend (mails transaccionales), Google Drive (sincronización
          de archivos, opcional), Telegram (bot de carga de solicitudes, opcional) y Vercel (hosting).
          Cada integración opcional requiere tu consentimiento explícito para activarse.
        </LegalSection>

        <LegalSection title="8. Cambios a esta política">
          Cualquier cambio relevante será notificado por mail o en la plataforma con al menos 15 días de
          anticipación. La versión vigente siempre estará disponible en esta página.
        </LegalSection>

        <LegalSection title="9. Contacto">
          Dudas o solicitudes relacionadas con privacidad:{" "}
          <a href="mailto:info@didigitalstudio.com" style={{ color: "var(--accent-bright)", textDecoration: "none", borderBottom: "1px dashed rgba(165,180,252,0.4)" }}>
            info@didigitalstudio.com
          </a>
        </LegalSection>
      </main>
    </div>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10, color: "var(--text-1)" }}>{title}</h2>
      <p style={{ fontSize: 14.5, color: "var(--text-2)", lineHeight: 1.65, textWrap: "pretty" }}>{children}</p>
    </div>
  );
}
