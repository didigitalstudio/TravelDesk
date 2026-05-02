import type { CSSProperties } from "react";

type IconProps = {
  size?: number;
  style?: CSSProperties;
  className?: string;
};

const Icon = ({ children, size = 18, style, className }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    className={className}
  >
    {children}
  </svg>
);

const iconPaths = {
  ticket: <><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"/><path d="M14 6v12" strokeDasharray="2 2"/></>,
  users: <><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c2.6.6 4.5 2.9 4.5 5.6"/></>,
  compare: <><rect x="3" y="4" width="7.5" height="16" rx="1.5"/><rect x="13.5" y="4" width="7.5" height="16" rx="1.5"/><path d="M5.5 8h2.5M5.5 11h3M5.5 14h2"/><path d="M16 8h2.5M16 11h3M16 14h2"/></>,
  pdf: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6"/><path d="M8 14h2a1.5 1.5 0 0 1 0 3H8v-3Zm0 0v4M14.5 14v4m0-4h2"/></>,
  wallet: <><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h12"/><circle cx="17" cy="13" r="1.2" fill="currentColor"/></>,
  bot: <><rect x="4" y="8" width="16" height="11" rx="2.5"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="13" r="1.2" fill="currentColor"/><circle cx="15" cy="13" r="1.2" fill="currentColor"/><path d="M9.5 16.5h5"/></>,
  inbox: <><path d="M3 13l3-8h12l3 8"/><path d="M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"/><path d="M3 13h5l1.5 2h5L16 13h5"/></>,
  currency: <><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.7-1-1.8-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 1.4 1.3 1.8 3 2.3 1.7.5 3 1 3 2.4S13.7 17 12 17c-1.3 0-2.4-.6-3-1.6"/><path d="M12 6.5v11"/></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16h4"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5L16 10"/></>,
  brand: <><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>,
  link: <><path d="M10 14a4 4 0 0 1 0-5.7l2.5-2.5a4 4 0 1 1 5.7 5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 1 0 5.7l-2.5 2.5a4 4 0 1 1-5.7-5.7l1.5-1.5"/></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3Z"/><path d="M9 12l2 2 4-4"/></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16Z"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
  arrowRight: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  arrowDown: <><path d="M12 5v14M6 13l6 6 6-6"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M16 16l4 4"/></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/></>,
  drive: <><path d="M9 4h6l6 10-3 6H6l-3-6L9 4Z"/><path d="M9 4l6 10M21 14H9M3 14l6-10"/></>,
  send: <><path d="M21 3L11 13M21 3l-7 18-3-8-8-3 18-7Z"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></>,
  phone: <><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></>,
  download: <><path d="M12 4v12M6 12l6 6 6-6"/><path d="M4 20h16"/></>,
  qrish: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M20 14v0M14 17v4M17 20h4"/></>,
  plane: <><path d="M3 12.5l3.5-1L9 14l3.5-1.2L4.5 6l1.6-.5 8.4 5 4.5-1.5a2 2 0 0 1 1.3 3.8l-15.5 5.7L3 12.5Z"/></>,
  planeUp: <><path d="M12 3l3 7 7 2-7 2-3 7-3-7-7-2 7-2 3-7Z"/></>,
  route: <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M5 8c0 6 14 4 14 8" strokeDasharray="3 3"/></>,
  suitcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/></>,
} as const;

type IconName = keyof typeof iconPaths;

export const I = ({ name, ...rest }: { name: IconName } & IconProps) => (
  <Icon {...rest}>{iconPaths[name]}</Icon>
);
