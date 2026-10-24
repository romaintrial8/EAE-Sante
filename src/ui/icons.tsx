import type { ReactNode } from 'react';

function I({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined}>
      {children}
    </svg>
  );
}

export const IconToday = () => <I><path d="M3 18h18" /><path d="M6 18a6 6 0 0 1 12 0" /><path d="M12 4v3M4.9 8.9l2.1 2.1M19.1 8.9 17 11M7 21h10" /></I>;
export const IconPlan = () => <I><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2" /></I>;
export const IconHealth = () => <I><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" /><path d="M6.5 12.5h3l1.5-2.5 2 4 1.5-1.5h3" /></I>;
export const IconTests = () => <I><circle cx="12" cy="13.5" r="7" /><path d="M12 13.5V10M10 3h4M12 3v3.5M18.5 7l1.3-1.3" /></I>;
export const IconConcours = () => <I><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></I>;
export const IconGear = () => <I><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></I>;
export const IconCheck = () => <I><path d="m5 12.5 4.5 4.5L19 7.5" /></I>;
export const IconLeft = () => <I><path d="m15 5-7 7 7 7" /></I>;
export const IconRight = () => <I><path d="m9 5 7 7-7 7" /></I>;
export const IconAlert = () => <I><path d="M12 3.5 2.5 20h19L12 3.5Z" /><path d="M12 10v4.5M12 17.5v.01" /></I>;
export const IconShield = () => <I><path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></I>;
export const IconInfo = () => <I><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" /></I>;
export const IconSync = () => <I><path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5" /><path d="M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.5l1.7-2" /><path d="M20 20v-4.5h-4.5" /></I>;
export const IconPlus = () => <I><path d="M12 5v14M5 12h14" /></I>;
export const IconClose = () => <I><path d="M6 6l12 12M18 6 6 18" /></I>;
export const IconTrash = () => <I><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></I>;

/** La cocarde : trois disques concentriques. */
export function Roundel({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#23408F" />
      <circle cx="12" cy="12" r="7.3" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="3.7" fill="#C8102E" />
    </svg>
  );
}
