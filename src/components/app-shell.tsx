"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AuditIcon, ReferralsIcon, ReviewIcon, SettingsIcon } from "./icons";
import { SessionIdentity } from "./session-identity";

import styles from "./app-shell.module.css";

const navigation = [
  { href: "/", label: "Referrals", icon: ReferralsIcon },
  { href: "/?status=NEEDS_REVIEW", label: "Review queue", icon: ReviewIcon },
  { href: "/?view=audit", label: "Audit", icon: AuditIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main-content">
        Skip to referral workspace
      </a>
      <header className={styles.header}>
        <Link
          aria-label="MedBot referral dashboard"
          className={styles.brand}
          href="/"
        >
          <span aria-hidden="true" className={styles.brandMark}>
            M
          </span>
          <span>
            <strong>MedBot</strong>
            <small>Referral operations</small>
          </span>
        </Link>
        <div className={styles.headerContext}>
          <span className={styles.environment}>Synthetic workspace</span>
          <span aria-hidden="true" className={styles.divider} />
          <SessionIdentity />
        </div>
      </header>
      <aside aria-label="Primary navigation" className={styles.sidebar}>
        <nav>
          {navigation.map(({ href, icon: Icon, label }) => {
            const active = href === "/" ? pathname === "/" : href === pathname;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={styles.navItem}
                data-active={active || undefined}
                href={href}
                key={label}
              >
                <Icon />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className={styles.boundaryNote}>
          <strong>Administrative workflow</strong>
          <p>MedBot does not diagnose, triage, or recommend treatment.</p>
        </div>
      </aside>
      <main className={styles.main} id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
