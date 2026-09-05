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

export default function SignUpPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { runSignUpTransition } = useAuthTransition();
  const t = useTranslations();
  const auth = t.auth;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(auth.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(auth.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      await runSignUpTransition(async () => {
        // No callbackURL, for the same reason as sign-in: it navigates the browser itself and
        // pre-empts the role-aware router.push() below, stranding a new account on the homepage.
        const result = await authClient.signUp.email({
          email: email.trim(),
          name: name.trim(),
          password,
        });

        if (result.error) {
          throw new Error(result.error.message ?? auth.signUpFailed);
        }

        const session = await authClient.getSession();
        if (!session.data?.user) {
          toast.success("Check your email to verify your account, then sign in.");
          router.push("/auth/sign-in");
          return;
        }

        await fetch("/api/auth/ensure-profile", { method: "POST" });

        const me = await fetchMeWithRetry();
        await refresh();

        const displayName = me?.name?.trim() || me?.email?.split("@")[0] || "";
        toast.success(
          displayName
            ? auth.welcomeNewToast.replace("{name}", displayName)
            : auth.welcomeNewToastFallback
        );

        const destination = getPostLoginDestination(me);
        router.push(destination);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : auth.signUpFailed);
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
          {auth.signUpTitle}
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          {auth.signUpSubtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className={executiveLabelClassName} style={{ color: "var(--color-text-muted)" }}>
            {auth.name}
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={auth.namePlaceholder}
            className={`${executiveFieldClassName} placeholder-gray-600`}
            style={executiveFieldStyle(!!name)}
          />
        </div>
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
            autoComplete="new-password"
            showLabel={auth.showPassword}
            hideLabel={auth.hidePassword}
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className={executiveLabelClassName}
            style={{ color: "var(--color-text-muted)" }}
          >
            {auth.confirmPassword}
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
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
          {loading ? auth.signUpSubmitting.toUpperCase() : auth.signUpSubmit.toUpperCase()}
          {!loading && <span>→</span>}
        </button>
      </form>

      <div className="mt-8 pt-4 border-t text-center" style={{ borderColor: "var(--color-sovereign-border)" }}>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {auth.alreadyHaveAccount}{" "}
          <Link href="/auth/sign-in" className="underline" style={{ color: "var(--color-gold)" }}>
            {auth.submit}
          </Link>
        </p>
      </div>

      <p className="text-xs text-center mt-6" style={{ color: "var(--color-text-muted)" }}>
        {auth.exploreOpportunityFirst}{" "}
        <Link href="/strategic-partnerships" className="underline" style={{ color: "var(--color-gold)" }}>
          {auth.startPartnershipInquiry}
        </Link>
      </p>
    </div>
  );
}
