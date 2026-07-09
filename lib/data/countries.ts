/** Minimal country + dial-code data for the phone field — intentionally hand-rolled rather than
 *  a phone-number library, consistent with how the rest of the site's forms are built. Flags are
 *  derived from the ISO 3166-1 alpha-2 code via the standard Unicode regional-indicator technique
 *  (no image assets or icon library required). */
export interface Country {
  name: string;
  iso2: string;
  dialCode: string;
}

export function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/** Zimbabwe first (platform default), then common investor-origin countries, then the rest
 *  alphabetically — keeps the highest-traffic choices at the top of the list. */
export const countries: Country[] = [
  { name: "Zimbabwe", iso2: "ZW", dialCode: "+263" },
  { name: "South Africa", iso2: "ZA", dialCode: "+27" },
  { name: "United Kingdom", iso2: "GB", dialCode: "+44" },
  { name: "United States", iso2: "US", dialCode: "+1" },
  { name: "United Arab Emirates", iso2: "AE", dialCode: "+971" },
  { name: "China", iso2: "CN", dialCode: "+86" },
  { name: "Nigeria", iso2: "NG", dialCode: "+234" },
  { name: "Kenya", iso2: "KE", dialCode: "+254" },
  { name: "India", iso2: "IN", dialCode: "+91" },
  { name: "Canada", iso2: "CA", dialCode: "+1" },
  { name: "Australia", iso2: "AU", dialCode: "+61" },
  { name: "Germany", iso2: "DE", dialCode: "+49" },
  { name: "Singapore", iso2: "SG", dialCode: "+65" },
  { name: "Botswana", iso2: "BW", dialCode: "+267" },
  { name: "Zambia", iso2: "ZM", dialCode: "+260" },
  { name: "Mozambique", iso2: "MZ", dialCode: "+258" },
  { name: "Namibia", iso2: "NA", dialCode: "+264" },
  { name: "Malawi", iso2: "MW", dialCode: "+265" },
  { name: "Angola", iso2: "AO", dialCode: "+244" },
  { name: "Tanzania", iso2: "TZ", dialCode: "+255" },
  { name: "Argentina", iso2: "AR", dialCode: "+54" },
  { name: "Austria", iso2: "AT", dialCode: "+43" },
  { name: "Belgium", iso2: "BE", dialCode: "+32" },
  { name: "Brazil", iso2: "BR", dialCode: "+55" },
  { name: "Chile", iso2: "CL", dialCode: "+56" },
  { name: "Egypt", iso2: "EG", dialCode: "+20" },
  { name: "Ethiopia", iso2: "ET", dialCode: "+251" },
  { name: "France", iso2: "FR", dialCode: "+33" },
  { name: "Ghana", iso2: "GH", dialCode: "+233" },
  { name: "Hong Kong", iso2: "HK", dialCode: "+852" },
  { name: "Indonesia", iso2: "ID", dialCode: "+62" },
  { name: "Ireland", iso2: "IE", dialCode: "+353" },
  { name: "Israel", iso2: "IL", dialCode: "+972" },
  { name: "Italy", iso2: "IT", dialCode: "+39" },
  { name: "Japan", iso2: "JP", dialCode: "+81" },
  { name: "Luxembourg", iso2: "LU", dialCode: "+352" },
  { name: "Malaysia", iso2: "MY", dialCode: "+60" },
  { name: "Mauritius", iso2: "MU", dialCode: "+230" },
  { name: "Mexico", iso2: "MX", dialCode: "+52" },
  { name: "Morocco", iso2: "MA", dialCode: "+212" },
  { name: "Netherlands", iso2: "NL", dialCode: "+31" },
  { name: "New Zealand", iso2: "NZ", dialCode: "+64" },
  { name: "Norway", iso2: "NO", dialCode: "+47" },
  { name: "Portugal", iso2: "PT", dialCode: "+351" },
  { name: "Qatar", iso2: "QA", dialCode: "+974" },
  { name: "Rwanda", iso2: "RW", dialCode: "+250" },
  { name: "Saudi Arabia", iso2: "SA", dialCode: "+966" },
  { name: "South Korea", iso2: "KR", dialCode: "+82" },
  { name: "Spain", iso2: "ES", dialCode: "+34" },
  { name: "Sweden", iso2: "SE", dialCode: "+46" },
  { name: "Switzerland", iso2: "CH", dialCode: "+41" },
  { name: "Turkey", iso2: "TR", dialCode: "+90" },
  { name: "Uganda", iso2: "UG", dialCode: "+256" },
];
