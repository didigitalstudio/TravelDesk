import type { CSSProperties, ReactNode, MouseEvent } from "react";

// ─── BrandMark ───────────────────────────────────────────────────────────────

export const BrandMark = ({ size = 32 }: { size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.28,
    background: "linear-gradient(135deg, #a5b4fc 0%, #818cf8 50%, #c084fc 100%)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    color: "#0a0a0b", fontWeight: 700,
    fontSize: size * 0.42, letterSpacing: "-0.02em",
    boxShadow: "0 6px 24px -8px rgba(129,140,248,0.55), inset 0 1px 0 rgba(255,255,255,0.4)",
    flexShrink: 0,
  }}>TD</div>
);

export const Wordmark = ({ size = 32 }: { size?: number }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
    <BrandMark size={size} />
    <span style={{ fontSize: size * 0.5, fontWeight: 600, letterSpacing: "-0.02em" }}>Travel Desk</span>
  </div>
);

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "ghost" | "plain";
type ButtonSize = "sm" | "md" | "lg";

type ButtonBaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  style?: CSSProperties;
  children?: ReactNode;
};

type ButtonAsButton = ButtonBaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };
type ButtonAsAnchor = ButtonBaseProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a" };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: { padding: "8px 14px", fontSize: 13, height: 34, gap: 6 },
  md: { padding: "11px 18px", fontSize: 14, height: 42, gap: 8 },
  lg: { padding: "14px 22px", fontSize: 15, height: 50, gap: 10 },
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "linear-gradient(180deg, #a5b4fc 0%, #818cf8 100%)",
    color: "#0a0a0b", border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 8px 24px -10px rgba(129,140,248,0.6), inset 0 1px 0 rgba(255,255,255,0.5)",
    fontWeight: 600,
  },
  ghost: {
    background: "rgba(255,255,255,0.03)", color: "var(--text-1)",
    border: "1px solid var(--border-2)", fontWeight: 500,
  },
  plain: {
    background: "transparent", color: "var(--text-2)",
    border: "1px solid transparent", fontWeight: 500,
  },
};

const hoverIn = (e: MouseEvent<HTMLElement>, variant: ButtonVariant) => {
  const el = e.currentTarget as HTMLElement;
  if (variant === "primary") {
    el.style.background = "linear-gradient(180deg, #c7d2fe 0%, #a5b4fc 100%)";
    el.style.transform = "translateY(-1px)";
  } else if (variant === "ghost") {
    el.style.background = "rgba(255,255,255,0.07)";
    el.style.borderColor = "var(--border-3)";
  } else {
    el.style.color = "var(--text-1)";
  }
};

const hoverOut = (e: MouseEvent<HTMLElement>, variant: ButtonVariant) => {
  const el = e.currentTarget as HTMLElement;
  if (variant === "primary") {
    el.style.background = "linear-gradient(180deg, #a5b4fc 0%, #818cf8 100%)";
    el.style.transform = "translateY(0)";
  } else if (variant === "ghost") {
    el.style.background = "rgba(255,255,255,0.03)";
    el.style.borderColor = "var(--border-2)";
  } else {
    el.style.color = "var(--text-2)";
  }
};

const baseButtonStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
  transition: "all 160ms ease", textDecoration: "none", whiteSpace: "nowrap",
};

export const Button = (props: ButtonProps) => {
  const { variant = "primary", size = "md", icon, iconRight, style = {}, children, as, ...rest } = props;
  const combined: CSSProperties = { ...baseButtonStyle, ...sizeStyles[size], ...variantStyles[variant], ...style };

  if (as === "a") {
    const { href, onClick, ...anchorRest } = rest as ButtonAsAnchor;
    return (
      <a
        href={href}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
        style={combined}
        onMouseEnter={(e) => hoverIn(e, variant)}
        onMouseLeave={(e) => hoverOut(e, variant)}
        {...(anchorRest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {icon}{children}{iconRight}
      </a>
    );
  }

  const { onClick, type, disabled, ...btnRest } = rest as ButtonAsButton;
  return (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled}
      style={combined}
      onMouseEnter={(e) => hoverIn(e, variant)}
      onMouseLeave={(e) => hoverOut(e, variant)}
      {...(btnRest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {icon}{children}{iconRight}
    </button>
  );
};

// ─── Pill ─────────────────────────────────────────────────────────────────────

type PillTone = "neutral" | "indigo" | "success" | "warning" | "danger" | "violet";

const pillTones: Record<PillTone, { bg: string; fg: string; border: string; dotC: string }> = {
  neutral: { bg: "rgba(255,255,255,0.06)", fg: "#cfcfd6", border: "rgba(255,255,255,0.10)", dotC: "#9aa0aa" },
  indigo:  { bg: "rgba(129,140,248,0.12)", fg: "#c7d2fe", border: "rgba(129,140,248,0.30)", dotC: "#a5b4fc" },
  success: { bg: "rgba(52,211,153,0.12)",  fg: "#6ee7b7", border: "rgba(52,211,153,0.28)",  dotC: "#34d399" },
  warning: { bg: "rgba(251,191,36,0.12)",  fg: "#fcd34d", border: "rgba(251,191,36,0.28)",  dotC: "#fbbf24" },
  danger:  { bg: "rgba(248,113,113,0.12)", fg: "#fca5a5", border: "rgba(248,113,113,0.28)", dotC: "#f87171" },
  violet:  { bg: "rgba(192,132,252,0.12)", fg: "#ddd6fe", border: "rgba(192,132,252,0.28)", dotC: "#c084fc" },
};

export const Pill = ({ tone = "neutral", children, dot = false, style = {} }: {
  tone?: PillTone; children: ReactNode; dot?: boolean; style?: CSSProperties;
}) => {
  const t = pillTones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px", borderRadius: 999,
      background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
      fontSize: 11.5, fontWeight: 500,
      letterSpacing: "0.01em", whiteSpace: "nowrap", ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dotC }}/>}
      {children}
    </span>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────

export const Card = ({ children, style = {}, accent = false, onMouseEnter, onMouseLeave, id }: {
  children: ReactNode; style?: CSSProperties; accent?: boolean;
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
  id?: string;
}) => (
  <div
    id={id}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={{
      background: accent
        ? "linear-gradient(180deg, rgba(129,140,248,0.08) 0%, rgba(17,17,20,0.9) 60%)"
        : "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(17,17,20,0.6) 80%)",
      border: `1px solid ${accent ? "rgba(129,140,248,0.25)" : "var(--border-1)"}`,
      borderRadius: 16,
      boxShadow: accent
        ? "0 30px 60px -30px rgba(129,140,248,0.35), inset 0 1px 0 rgba(255,255,255,0.05)"
        : "0 20px 40px -24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
      backdropFilter: "blur(8px)",
      ...style,
    }}
  >
    {children}
  </div>
);

// ─── Eyebrow ─────────────────────────────────────────────────────────────────

export const Eyebrow = ({ children, tone = "indigo" }: { children: ReactNode; tone?: "indigo" | "muted" }) => (
  <div className="mono" style={{
    color: tone === "indigo" ? "var(--accent-bright)" : "var(--text-3)",
    fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500,
  }}>{children}</div>
);

// ─── SectionHeader ────────────────────────────────────────────────────────────

export const SectionHeader = ({ eyebrow, title, sub, align = "left", maxWidth = 720 }: {
  eyebrow?: string; title: string; sub?: string;
  align?: "left" | "center"; maxWidth?: number;
}) => (
  <div style={{ textAlign: align, maxWidth, marginInline: align === "center" ? "auto" : undefined, marginBottom: 36 }}>
    {eyebrow && <div style={{ marginBottom: 14 }}><Eyebrow>{eyebrow}</Eyebrow></div>}
    <h2 style={{ fontSize: "clamp(28px, 4.2vw, 44px)", marginBottom: sub ? 16 : 0, textWrap: "balance" }}>
      {title}
    </h2>
    {sub && <p style={{ fontSize: 17, color: "var(--text-2)", lineHeight: 1.55, textWrap: "pretty" }}>{sub}</p>}
  </div>
);

// ─── Section ─────────────────────────────────────────────────────────────────

export const Section = ({ children, id, style = {}, narrow = false }: {
  children: ReactNode; id?: string; style?: CSSProperties; narrow?: boolean;
}) => (
  <section id={id} style={{
    maxWidth: narrow ? 980 : 1240, margin: "0 auto",
    padding: "72px 32px", ...style,
  }}>
    {children}
  </section>
);
