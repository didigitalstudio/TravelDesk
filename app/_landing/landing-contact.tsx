"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { I } from "./landing-icons";
import { Button, Card, Eyebrow, Section } from "./landing-primitives";

type Status = "idle" | "sending" | "sent" | "error";

type Form = { nombre: string; empresa: string; tipo: string; email: string; tel: string; msg: string };

const inputStyle: CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-2)",
  color: "var(--text-1)", fontFamily: "inherit", fontSize: 14,
  transition: "all 160ms ease", outline: "none",
};

const Label = ({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor: string; hint?: string }) => (
  <label htmlFor={htmlFor} style={{
    fontSize: 12.5, color: "var(--text-2)", display: "flex", alignItems: "baseline",
    justifyContent: "space-between", marginBottom: 6,
  }}>
    <span>{children}</span>
    {hint && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{hint}</span>}
  </label>
);

const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = "var(--accent)");
const blurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = "var(--border-2)");

export const LandingContact = () => {
  const [form, setForm] = useState<Form>({ nombre: "", empresa: "", tipo: "agencia", email: "", tel: "", msg: "" });
  const [status, setStatus] = useState<Status>("idle");

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "send failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <Section id="demo">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 56 }}>
        <div>
          <Eyebrow>Demo</Eyebrow>
          <h2 style={{ fontSize: "clamp(28px, 4.2vw, 44px)", margin: "14px 0 18px", textWrap: "balance" }}>
            Solicitá una demo.
          </h2>
          <p style={{ fontSize: 17, color: "var(--text-2)", lineHeight: 1.55, textWrap: "pretty", marginBottom: 28 }}>
            Te respondemos en <strong style={{ color: "var(--text-1)", fontWeight: 500 }}>24 hs hábiles</strong> con
            un demo personalizado para tu agencia u operación. Si querés, te armamos el primer expediente en vivo durante la llamada.
          </p>

          <Card style={{ padding: 22, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)",
              }}><I name="check" size={16}/></div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Onboarding incluido</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>Migramos tu CRM y vinculamos a tus operadores.</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-bright)",
              }}><I name="phone" size={16}/></div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Soporte humano en español</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>Respondemos por mail y WhatsApp en horario LatAm.</div>
              </div>
            </div>
          </Card>

          <div style={{ fontSize: 13, color: "var(--text-3)" }}>
            ¿Preferís escribirnos directo?{" "}
            <a href="mailto:info@didigitalstudio.com" style={{ color: "var(--accent-bright)", textDecoration: "none", borderBottom: "1px dashed rgba(129,140,248,0.4)" }}>
              info@didigitalstudio.com
            </a>
          </div>
        </div>

        <Card style={{ padding: 28 }} id="contacto">
          {status === "sent" ? (
            <div style={{ textAlign: "center", padding: "40px 8px" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, marginInline: "auto", marginBottom: 18,
                background: "rgba(52,211,153,0.14)", border: "1px solid rgba(52,211,153,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)",
              }}><I name="check" size={26}/></div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Mensaje recibido.</div>
              <p style={{ fontSize: 14, color: "var(--text-2)" }}>Te respondemos en 24 hs hábiles.</p>
              <Button variant="ghost" size="sm" style={{ marginTop: 18 }} onClick={() => { setStatus("idle"); setForm({ nombre: "", empresa: "", tipo: "agencia", email: "", tel: "", msg: "" }); }}>
                Enviar otra consulta
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <Label htmlFor="nombre">Nombre y apellido</Label>
                <input id="nombre" required value={form.nombre} onChange={set("nombre")} style={inputStyle}
                  onFocus={focusBorder} onBlur={blurBorder}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
                <div>
                  <Label htmlFor="empresa">Empresa</Label>
                  <input id="empresa" required value={form.empresa} onChange={set("empresa")} style={inputStyle}
                    onFocus={focusBorder} onBlur={blurBorder}/>
                </div>
                <div>
                  <Label htmlFor="tipo">Sos…</Label>
                  <select id="tipo" value={form.tipo} onChange={set("tipo")}
                    style={{ ...inputStyle, appearance: "none" }}
                    onFocus={focusBorder} onBlur={blurBorder}>
                    <option value="agencia">Agencia</option>
                    <option value="operador">Operador</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <input id="email" type="email" required value={form.email} onChange={set("email")} style={inputStyle}
                  onFocus={focusBorder} onBlur={blurBorder}/>
              </div>
              <div>
                <Label htmlFor="tel" hint="opcional">Teléfono</Label>
                <input id="tel" value={form.tel} onChange={set("tel")} style={inputStyle}
                  onFocus={focusBorder} onBlur={blurBorder}/>
              </div>
              <div>
                <Label htmlFor="msg" hint="opcional">Mensaje</Label>
                <textarea id="msg" rows={4} value={form.msg} onChange={set("msg")}
                  style={{ ...inputStyle, resize: "vertical" }}
                  onFocus={focusBorder} onBlur={blurBorder}/>
              </div>

              {status === "error" && (
                <div style={{ fontSize: 13, color: "var(--danger)", textAlign: "center" }}>
                  Hubo un problema al enviar. Intentá de nuevo o escribinos a info@didigitalstudio.com.
                </div>
              )}

              <Button type="submit" size="lg" disabled={status === "sending"}
                iconRight={status === "sending" ? undefined : <I name="arrowRight" size={15} style={{ marginLeft: 6 }}/>}>
                {status === "sending" ? "Enviando…" : "Enviar solicitud"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </Section>
  );
};
