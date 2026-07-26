/** Common consumer webmail domains — used only for a non-blocking hint on the public application
 *  form (never a hard gate; see the KYC-at-NDA gate for where corporate details actually become
 *  mandatory). Staff-created accounts in the Users & Roles workspace are unaffected. */
const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "live.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "mail.com",
  "yandex.com",
]);

/** True if `email` looks syntactically plausible and its domain is a well-known consumer webmail
 *  provider rather than a corporate/organizational domain. */
export function isFreeMailDomain(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return FREE_MAIL_DOMAINS.has(domain);
}
