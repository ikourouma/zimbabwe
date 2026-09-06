import Link from "next/link";
import Image from "next/image";
import { platformName } from "@/content/zimbabwe-site";

export type ExecutiveAccessVariant = "register" | "sign-in" | "sign-up";

interface ExecutiveAccessShellProps {
  variant: ExecutiveAccessVariant;
  children: React.ReactNode;
}

const registerBullets = [
  { label: "ZIDA Project Registry", sub: "Searchable catalogue with governed publication workflow" },
  { label: "Capital & Scope Indicators", sub: "Unlock financial estimates after qualification review" },
  { label: "Strategic Alignment Mapping", sub: "Pillars, SDGs, and sector intelligence" },
];

const signInBullets = [
  { label: "Role-Based Entitlements", sub: "Registered, qualified, government, and admin access tiers" },
  { label: "Governed Deal Room", sub: "Private workspace for approved investors and ministries" },
  { label: "Institutional Consoles", sub: "ZIDA admin review and super-admin taxonomy control" },
];

const signUpBullets = [
  { label: "Instant Registry Access", sub: "No waiting — browse the full ZIDA 2025 catalogue immediately" },
  { label: "Strategic Alignment Mapping", sub: "Pillars, SDGs, and sector intelligence" },
  { label: "Qualify for the Deal Room", sub: "Unlock capital estimates via a Strategic Partnership inquiry" },
];

function LeftPanelContent({ variant }: { variant: ExecutiveAccessVariant }) {
  const isRegister = variant === "register";
  const isSignUp = variant === "sign-up";
  const bullets = isRegister ? registerBullets : isSignUp ? signUpBullets : signInBullets;

  return (
    <>
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-widest mb-8 w-fit"
        style={{
          backgroundColor: "rgba(0,100,0,0.2)",
          border: "1px solid rgba(0,100,0,0.4)",
          color: "var(--color-zim-accent-pale)",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#FFD300] animate-pulse" />
        {isRegister ? "Investor Registration Gateway" : isSignUp ? "Self-Service Registry Access" : "Secure Access Gateway"}
      </div>

      <h1
        className="mb-6 font-bold leading-tight"
        style={{
          fontSize: "clamp(2rem, 3vw, 2.75rem)",
          color: "var(--color-text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        {isRegister
          ? "Unlock Governed ZIDA Investment Intelligence"
          : isSignUp
            ? "Create Your Governed Registry Profile"
            : "Sign In to Your Governed Profile"}
      </h1>

      <p
        className="text-base leading-relaxed mb-10"
        style={{ color: "var(--color-text-secondary)", lineHeight: "1.85" }}
      >
        {isRegister
          ? "Submit your investor application to access expanded project details, capital estimates, and engagement tools across Zimbabwe's ZIDA 2025 catalogue — reviewed under Afronovation's governed platform infrastructure."
          : isSignUp
            ? "Create a free account for immediate access to the ZIDA project registry. Submit a Strategic Partnership inquiry afterward to qualify for the full Deal Room and financial detail."
            : "Returning investors, ministry stakeholders, and platform administrators sign in here for role-based access to registry entitlements, the Deal Room, and institutional consoles."}
      </p>

      <div className="space-y-5">
        {bullets.map((item) => (
          <div key={item.label} className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-5 h-5 rounded-full mt-0.5 flex items-center justify-center"
              style={{
                background: "rgba(255,211,0,0.15)",
                border: "1px solid rgba(255,211,0,0.35)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFD300]" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {item.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {item.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-6 border-t" style={{ borderColor: "var(--color-sovereign-border)" }}>
        <div className="flex items-start gap-3">
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            style={{ color: "var(--color-text-muted)" }}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {isRegister ? (
              <>
                Applications are stored securely and routed for credential review. Access credentials
                are issued after qualification — this platform does not replace ZIDA or official
                Government of Zimbabwe systems.
              </>
            ) : isSignUp ? (
              <>
                Your account is created instantly at the &ldquo;Registered&rdquo; tier. Financial
                indicators and project documents are released once ZIDA has verified your
                organisation.
              </>
            ) : (
              <>
                New to the platform?{" "}
                <Link href="/auth/sign-up" className="underline" style={{ color: "var(--color-gold)" }}>
                  Create an account
                </Link>{" "}
                to browse the national project registry.
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
}

export function ExecutiveAccessShell({ variant, children }: ExecutiveAccessShellProps) {
  return (
    <main className="min-h-screen flex" style={{ backgroundColor: "var(--color-sovereign-black)" }}>
      <div
        className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative flex-col p-16 xl:p-24 overflow-hidden"
        style={{
          background: "linear-gradient(150deg, #0d1a0d 0%, #071007 50%, #030a03 100%)",
          borderRight: "1px solid var(--color-sovereign-border)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,100,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,100,0,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: "20%",
            left: "10%",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(0,100,0,0.15) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "10%",
            right: "-10%",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(255,211,0,0.06) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex-shrink-0 mb-10">
          <Link href="/" className="flex items-center gap-4 group w-fit">
            <Image
              src="/brand/zimbabwe-map-icon.png"
              alt="Republic of Zimbabwe"
              width={56}
              height={56}
              className="object-contain"
              priority
              sizes="56px"
            />
            <div>
              <p className="section-overline mb-0.5" style={{ fontSize: "0.7rem", letterSpacing: "0.15em" }}>
                {platformName.overline}
              </p>
              <p className="font-semibold" style={{ color: "var(--color-text-primary)", fontSize: "1rem" }}>
                {platformName.short}
              </p>
            </div>
          </Link>
        </div>

        <div className="relative z-10 max-w-xl flex-1 flex flex-col justify-center">
          <LeftPanelContent variant={variant} />
        </div>

        <div className="relative z-10 flex-shrink-0 mt-8 flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            © {new Date().getFullYear()} Afronovation, Inc. — Implementation Partner
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Cary, NC · hello@afronovation.com
          </p>
        </div>
      </div>

      <div className="w-full lg:w-[45%] xl:w-[42%] flex flex-col py-16 px-6 sm:px-12 xl:py-24 relative overflow-y-auto max-h-screen">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,211,0,0.3), transparent)",
          }}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full">{children}</div>
        </div>
        <div className="flex-shrink-0 mt-8 flex items-center justify-between max-w-md w-full mx-auto">
          <Link
            href="/"
            className="text-xs transition-colors hover:text-white"
            style={{ color: "var(--color-text-muted)" }}
          >
            ← Return to Public Platform
          </Link>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Afronovation, Inc.
          </p>
        </div>
      </div>
    </main>
  );
}
