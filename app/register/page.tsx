import { redirect } from "next/navigation";

// /register used to be an investor "application" form that only ever wrote a strategic_inquiries
// row (never a real account) — see PRODUCTION_MIGRATION_PLAN.md / the "Real Self-Service Sign-Up"
// plan for why that's the wrong default now. Every existing link to "/register" across the site
// (nav, homepage CTA, sectors, FAQ, project unlock prompts, etc.) keeps working unchanged since
// they all just point at this same path, which now seamlessly forwards to the real signup page.
export default function RegisterRedirectPage() {
  redirect("/auth/sign-up");
}
