"use client";

import { useState, useEffect } from "react";
import { Button, Wordmark } from "./landing-primitives";

const links = [
  { label: "Producto", href: "#producto" },
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Para clientes", href: "#para-clientes" },
  { label: "Demo", href: "#demo" },
  { label: "Contacto", href: "#contacto" },
];

const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  if (!href.startsWith("#")) return;
  const el = document.querySelector(href);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: "smooth", block: "start" });
};

export const LandingNav = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      transition: "all 220ms ease",
      background: scrolled ? "rgba(10,10,11,0.7)" : "transparent",
      backdropFilter: scrolled ? "blur(14px) saturate(140%)" : "none",
      borderBottom: scrolled ? "1px solid var(--border-1)" : "1px solid transparent",
    }}>
      <div style={{
        maxWidth: 1240, margin: "0 auto", padding: "14px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
      }}>
        <a href="#top" onClick={(e) => scrollTo(e, "#top")} style={{ textDecoration: "none", color: "inherit" }}>
          <Wordmark size={30} />
        </a>

        <nav style={{ display: "flex", alignItems: "center", gap: 4 }} className="td-nav-links">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={(e) => scrollTo(e, l.href)} style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 14,
              color: "var(--text-2)", textDecoration: "none", fontWeight: 500,
              transition: "color 140ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-2)")}>
              {l.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button variant="plain" size="sm" as="a" href="https://traveldesk-two.vercel.app/login">
            Iniciar sesión
          </Button>
          <Button variant="primary" size="sm" as="a" href="#demo" onClick={(e) => scrollTo(e, "#demo")}>
            Solicitar demo
          </Button>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) { .td-nav-links { display: none !important; } }
      `}</style>
    </header>
  );
};
