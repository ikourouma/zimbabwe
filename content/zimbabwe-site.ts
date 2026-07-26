/**
 * @deprecated Use `getMessages(locale)` from `@/lib/i18n` for locale-aware content.
 * Re-exports English defaults for pages not yet wired to LocaleProvider.
 */
import { enMessages } from "@/lib/i18n/messages/en";

export const gatewaySlides = enMessages.gatewaySlides;
export const matrixNodes = enMessages.matrixNodes;
export const platformName = enMessages.platformName;
export const classificationStrip = enMessages.classificationStrip;
export const accessTiers = enMessages.accessTiers;
export const engagementSteps = enMessages.engagementSteps;
