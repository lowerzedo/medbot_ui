import type { Metadata } from "next";

import { getServerConfig } from "@/lib/server-config";
import { safeReturnTo } from "@/lib/url-safety";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "Sign in" };

interface LoginPageProps {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}

const errorMessages: Record<string, string> = {
  invalid_callback: "The sign-in response could not be verified. Start again.",
  token_exchange:
    "The identity provider did not complete sign-in. Start again.",
  provider_unavailable:
    "The identity provider is unavailable. Try again shortly.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, returnTo } = await searchParams;
  const { authMode } = getServerConfig();
  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo ?? null))}`;
  return (
    <main className={styles.page}>
      <section aria-labelledby="sign-in-heading" className={styles.panel}>
        <div aria-hidden="true" className={styles.mark}>
          M
        </div>
        <div>
          <p className={styles.product}>MedBot referral operations</p>
          <h1 id="sign-in-heading">Sign in to review referrals</h1>
          <p className={styles.summary}>
            Access is limited to authorized intake, review, supervision, and
            audit roles.
          </p>
        </div>
        {error ? (
          <p className="inline-notice" data-tone="danger" role="alert">
            {errorMessages[error] ??
              "Sign-in could not be completed. Start again."}
          </p>
        ) : null}
        <a className="button button-primary" href={loginHref}>
          {authMode === "oidc"
            ? "Sign in with Keycloak"
            : "Continue with local identity"}
        </a>
        <p className={styles.boundary}>
          Administrative workflow only. MedBot does not diagnose, triage, or
          recommend treatment.
        </p>
      </section>
    </main>
  );
}
