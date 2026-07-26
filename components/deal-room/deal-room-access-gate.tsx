import Link from "next/link";
import { RegistrationPrompt } from "@/components/shared/registration-prompt";

interface DealRoomAccessGateProps {
  isAuthenticated: boolean;
}

/** Shared "not qualified" gate for every Deal Room sub-route (Overview/Pipeline/Engagements) —
 *  previously only existed on the single all-in-one page. */
export function DealRoomAccessGate({ isAuthenticated }: DealRoomAccessGateProps) {
  return (
    <div className="mx-auto max-w-xl text-center py-16">
      <span
        className="inline-block mb-4 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ backgroundColor: "rgba(255,211,0,0.15)", color: "#fde047" }}
      >
        Pilot — sign in with a qualified account
      </span>
      <h1 className="text-2xl font-semibold text-white mb-2">Deal Room</h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
        The Deal Room is reserved for qualified investors, government/ministry users, and platform admins working an
        active deal.
      </p>
      <RegistrationPrompt
        message="Register your interest to be considered for Deal Room access once your qualification is confirmed."
        ctaLabel="Register to request access"
        dark
      />
      {!isAuthenticated && (
        <p className="text-xs mt-6" style={{ color: "var(--color-text-muted)" }}>
          Already have pilot access?{" "}
          <Link href="/auth/sign-in" className="underline">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
