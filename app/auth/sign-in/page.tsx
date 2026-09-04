"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/auth/password-input";
import {
  executiveFieldClassName,
  executiveFieldStyle,
  executiveLabelClassName,
} from "@/components/auth/executive-field-styles";
import { useAuth } from "@/context/auth-context";
import { useAuthTransition } from "@/context/auth-transition-context";
import { useTranslations } from "@/context/locale-context";
import { authClient } from "@/lib/auth/client";
import { fetchMeWithRetry } from "@/lib/auth/fetch-me";
import { getPostLoginDestination } from "@/lib/auth/post-login-destination";

export default function SignInPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { runSignInTransition } = useAuthTransition();
  const t = useTranslations();
  const auth = t.auth;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await runSignInTransition(async () => {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: "/",
        });

        if (result.error) {
          throw new Error(result.error.message ?? auth.signInFailed);
        }

        await authClient.getSession();
        await fetch("/api/auth/ensure-profile", { method: "POST" });

        const me = await fetchMeWithRetry();
        await refresh();

        const displayName = me?.name?.trim() || me?.email?.split("@")[0] || "";
        toast.success(
          displayName
            ? auth.welcomeBackToast.replace("{name}", displayName)
            : auth.welcomeBackToastFallback
        );

        const destination = getPostLoginDestination(me);
        router.push(destination);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : auth.signInFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full relative z-10 my-10">
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
        >
          {auth.signInTitle}
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          {auth.signInSubtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={executiveLabelClassName} style={{ color: "var(--color-text-muted)" }}>
            {auth.email}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={auth.emailPlaceholder}
            className={`${executiveFieldClassName} placeholder-gray-600`}
            style={executiveFieldStyle(!!email)}
          />
        </div>
        <div>
          <label htmlFor="password" className={executiveLabelClassName} style={{ color: "var(--color-text-muted)" }}>
            {auth.password}
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            showLabel={auth.showPassword}
            hideLabel={auth.hidePassword}
          />
        </div>
        {error && (
          <p className="text-xs" style={{ color: "#f87171" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 mt-2 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "#006400",
            color: "#ffffff",
            boxShadow: "0 4px 14px 0 rgba(0, 100, 0, 0.35)",
          }}
        >
          {loading ? auth.submitting.toUpperCase() : auth.submit.toUpperCase()}
          {!loading && <span>→</span>}
        </button>
      </form>

      <div className="mt-8 pt-4 border-t text-center" style={{ borderColor: "var(--color-sovereign-border)" }}>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {auth.needAccess}{" "}
          <Link href="/auth/sign-up" className="underline" style={{ color: "var(--color-gold)" }}>
            {auth.applyForAccess}
          </Link>
        </p>
      </div>
    </div>
  );
}
