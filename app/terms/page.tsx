import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function TermsPage() {
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
          <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", marginBottom: 12 }}>Términos y condiciones</h1>
          <p style={{ fontSize: 13.5, color: "var(--text-3)" }}>Última actualización: mayo de 2026</p>
        </div>

        <LegalSection title="1. Aceptación de los términos">
          Al acceder y utilizar Travel Desk (en adelante, "el Servicio"), aceptás estos términos y condiciones en su totalidad.
          Si no estás de acuerdo con alguna parte, te pedimos que no utilices el Servicio.
        </LegalSection>

        <LegalSection title="2. Descripción del servicio">
          Travel Desk es una plataforma SaaS que centraliza el ciclo completo de un viaje — cotización, aceptación,
          documentación, emisión y cobro — para agencias de viaje minoristas y operadores turísticos mayoristas.
          El acceso se otorga mediante cuentas individuales con autenticación segura.
        </LegalSection>

        <LegalSection title="3. Cuentas y acceso">
          Cada usuario es responsable de mantener la confidencialidad de sus credenciales. Cualquier actividad
          realizada desde una cuenta es responsabilidad del titular. DI Digital Studio se reserva el derecho de
          suspender cuentas que infrinjan estos términos.
        </LegalSection>

        <LegalSection title="4. Datos y privacidad">
          El tratamiento de los datos personales se rige por nuestra{" "}
          <Link href="/privacy" style={{ color: "var(--accent-bright)", textDecoration: "none", borderBottom: "1px dashed rgba(165,180,252,0.4)" }}>
            Política de privacidad
          </Link>.
          Los datos cargados en el Servicio (clientes, solicitudes, documentos) pertenecen a la agencia u operador
          que los genera. Travel Desk no comercializa datos de usuarios ni de sus clientes.
        </LegalSection>

        <LegalSection title="5. Propiedad intelectual">
          El código, diseño, marca y contenidos de Travel Desk son propiedad de DI Digital Studio. Queda prohibida
          su reproducción o distribución sin autorización expresa por escrito.
        </LegalSection>

        <LegalSection title="6. Limitación de responsabilidad">
          El Servicio se provee "tal como está". DI Digital Studio no garantiza disponibilidad ininterrumpida y no
          será responsable por pérdidas indirectas derivadas del uso o imposibilidad de uso del Servicio.
        </LegalSection>

        <LegalSection title="7. Modificaciones">
          Nos reservamos el derecho de actualizar estos términos con 15 días de preaviso notificados por mail o en
          la plataforma. El uso continuado del Servicio implica la aceptación de los cambios.
        </LegalSection>

        <LegalSection title="8. Contacto">
          Consultas sobre estos términos:{" "}
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
