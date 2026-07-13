import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "arrows"
  | "chart"
  | "wallet"
  | "settings"
  | "search"
  | "bell"
  | "plus"
  | "arrowUp"
  | "arrowDown"
  | "arrowRight"
  | "bowl"
  | "car"
  | "bag"
  | "receipt"
  | "spark"
  | "target"
  | "close"
  | "check"
  | "trash"
  | "bank"
  | "card"
  | "edit"
  | "archive"
  | "restore"
  | "calendar"
  | "flag"
  | "lock";

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
  arrows: <><path d="M7 7h13l-3-3"/><path d="m20 7-3 3"/><path d="M17 17H4l3 3"/><path d="m4 17 3-3"/></>,
  chart: <><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></>,
  wallet: <><path d="M3 6h15a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13"/><path d="M20 11h-5a2 2 0 0 0 0 4h5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  arrowUp: <><path d="m18 15-6-6-6 6"/></>,
  arrowDown: <><path d="m6 9 6 6 6-6"/></>,
  arrowRight: <><path d="m9 18 6-6-6-6"/></>,
  bowl: <><path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M8 7c0-2 1-3 1-4"/><path d="M13 7c0-2 1-3 1-4"/></>,
  car: <><path d="m5 17-1 3"/><path d="m19 17 1 3"/><path d="M3 13h18v5H3Z"/><path d="m5 13 2-6h10l2 6"/><circle cx="7" cy="16" r="1"/><circle cx="17" cy="16" r="1"/></>,
  bag: <><path d="M5 8h14l-1 13H6Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
  receipt: <><path d="M6 3v18l3-2 3 2 3-2 3 2V3l-3 2-3-2-3 2Z"/><path d="M9 10h6"/><path d="M9 14h4"/></>,
  spark: <><path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7Z"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  close: <><path d="m6 6 12 12"/><path d="M18 6 6 18"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  trash: <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 14h10l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/></>,
  bank: <><path d="m3 9 9-5 9 5"/><path d="M5 10h14"/><path d="M6 10v8"/><path d="M10 10v8"/><path d="M14 10v8"/><path d="M18 10v8"/><path d="M3 20h18"/></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
  archive: <><path d="M4 7h16v13H4Z"/><path d="M3 4h18v3H3Z"/><path d="M9 11h6"/></>,
  restore: <><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v6h6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
  flag: <><path d="M5 21V4"/><path d="M5 5h11l-2 4 2 4H5"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
