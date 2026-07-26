/**
 * @deprecated Use `getMessages(locale).nav` from `@/lib/i18n` instead.
 * Kept for backward compatibility during the i18n rollout.
 */
import { enMessages } from "@/lib/i18n/messages/en";

export type NavLink = { label: string; href: string };

export const primaryNavLinks: NavLink[] = [...enMessages.nav.primary];
export const footerPlatformLinks: NavLink[] = [...enMessages.nav.footerPlatform];
export const footerExecutiveLinks: NavLink[] = [...enMessages.nav.footerExecutive];
export const footerLegalLinks: NavLink[] = [...enMessages.nav.footerLegal];
export const utilityNavLinks: NavLink[] = [...enMessages.nav.utility];
