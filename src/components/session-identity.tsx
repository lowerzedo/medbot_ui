"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { CurrentUser } from "@/lib/contracts";

import styles from "./app-shell.module.css";

function roleLabel(role: CurrentUser["roles"][number] | undefined): string {
  if (!role) return "Authenticated user";
  return role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function initials(identifier: string): string {
  return (
    identifier
      .split(/[-_.\s]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "MB"
  );
}

export function SessionIdentity() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.ok) {
          setUser((await response.json()) as CurrentUser);
        } else {
          setUnavailable(true);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setUnavailable(true);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className={styles.user}>
      <span aria-hidden="true" className={styles.avatar}>
        {initials(user?.user_id ?? "MedBot")}
      </span>
      <span className={styles.userCopy}>
        {unavailable ? (
          <Link className={styles.sessionLink} href="/login">
            Sign in
          </Link>
        ) : (
          <>
            <strong>{user?.user_id ?? "Checking session"}</strong>
            <small>{user ? roleLabel(user.roles[0]) : "Please wait"}</small>
          </>
        )}
      </span>
    </div>
  );
}
