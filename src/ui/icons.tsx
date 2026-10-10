import type { ReactNode } from 'react';
import type { Tone } from '../domain/habits';

function Svg({ size = 20, sw = 2, children }: { size?: number; sw?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconCheck = () => <Svg size={24} sw={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const IconDash = () => <Svg size={22} sw={3}><path d="M6 12h12" /></Svg>;
export const IconMinus = () => <Svg size={18} sw={2.5}><path d="M5 12h14" /></Svg>;
export const IconPlus = () => <Svg size={18} sw={2.5}><path d="M5 12h14M12 5v14" /></Svg>;
export const IconLeft = () => <Svg sw={2.5}><path d="M15 5l-7 7 7 7" /></Svg>;
export const IconRight = () => <Svg sw={2.5}><path d="M9 5l7 7-7 7" /></Svg>;
export const IconGear = () => <Svg size={22}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>;
export const IconPlay = () => <Svg size={18}><path d="M7 5l12 7-12 7z" /></Svg>;
export const IconPause = () => <Svg size={18}><path d="M8 5v14M16 5v14" /></Svg>;

export const TabDay = () => <Svg size={22}><circle cx="12" cy="12" r="8" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></Svg>;
export const TabCalendar = () => <Svg size={22}><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></Svg>;
export const TabBible = () => <Svg size={22}><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" /></Svg>;
export const TabProgress = () => <Svg size={22}><path d="M5 20V11M12 20V5M19 20v-6" /></Svg>;

const TONE_PATHS: Record<Tone, ReactNode> = {
  txt: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></>,
  bib: <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />,
  reu: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 0 1 0 5.5M18 14.5c1.8.8 3 2.5 3 5.5" /></>,
  pre: <path d="M4 5h16v11H9l-5 4z" />,
  est: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  prep: <path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3" />,
  saude: <path d="M3 12h4l2-5 4 10 2-5h6" />,
  trab: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></>
};

export function ToneIcon({ tone }: { tone: Tone }) {
  return <span className="ic"><Svg size={18}>{TONE_PATHS[tone]}</Svg></span>;
}

export function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="20" width="8" height="9" rx="2" fill="#fff" opacity=".6" />
      <rect x="12" y="13" width="8" height="16" rx="2" fill="#fff" opacity=".8" />
      <rect x="21" y="5" width="8" height="24" rx="2" fill="#fff" />
    </svg>
  );
}
