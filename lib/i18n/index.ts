import type { Locale } from "./locales";
import { enMessages } from "./messages/en";
import { frMessages } from "./messages/fr";

export type { SiteMessages } from "./messages/en";

export function getMessages(locale: Locale) {
  return locale === "fr" ? frMessages : enMessages;
}

export { enMessages, frMessages };
