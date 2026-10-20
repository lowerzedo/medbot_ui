"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { readApiError } from "@/lib/api-error";
import type {
  ReferralListResponse,
  ReferralStatus,
  ReferralSummary,
} from "@/lib/contracts";

import { ArrowRightIcon, SearchIcon, UploadIcon } from "./icons";
import { StatusBadge } from "./status-badge";
import { ProcessingContext } from "./processing-context";

import styles from "./referral-dashboard.module.css";

const statusOptions: Array<{ label: string; value: ReferralStatus | "ALL" }> = [
  { label: "All statuses", value: "ALL" },
  { label: "Received", value: "RECEIVED" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Needs review", value: "NEEDS_REVIEW" },
  { label: "Needs information", value: "NEEDS_INFORMATION" },
  { label: "Ready to route", value: "READY_TO_ROUTE" },
  { label: "Routed", value: "ROUTED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Failed", value: "FAILED" },
];

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shortId(value: string): string {
  return value.slice(0, 8).toUpperCase();
}

export function ReferralDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [referrals, setReferrals] = useState<ReferralSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [queue, setQueue] = useState("ALL");
  const [completeness, setCompleteness] = useState<
    "ALL" | "COMPLETE" | "INCOMPLETE"
  >("ALL");
  const [status, setStatus] = useState<ReferralStatus | "ALL">(
    (searchParams.get("status") as ReferralStatus | null) ?? "ALL",
  );

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/referrals", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (response.status === 401) {
        router.replace("/login?returnTo=%2F");
        return;
      }
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = (await response.json()) as
        | ReferralListResponse
        | ReferralSummary[];
      setReferrals(Array.isArray(payload) ? payload : payload.items);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Referrals could not be loaded. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReferrals(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReferrals]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return referrals.filter((referral) => {
      const matchesStatus = status === "ALL" || referral.status === status;
      const matchesQueue = queue === "ALL" || referral.routing_queue === queue;
      const matchesCompleteness =
        completeness === "ALL" ||
        (completeness === "COMPLETE"
          ? referral.complete === true
          : referral.complete !== true);
      const searchable = [
        referral.id,
        referral.requested_service ?? "",
        referral.routing_queue ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesStatus &&
        matchesQueue &&
        matchesCompleteness &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [completeness, query, queue, referrals, status]);

  const queueOptions = useMemo(
    () =>
      Array.from(
        new Set(
          referrals
            .map((referral) => referral.routing_queue)
            .filter((value): value is string => value !== null),
        ),
      ).sort(),
    [referrals],
  );

  const counts = useMemo(
    () => ({
      active: referrals.filter((item) =>
        ["RECEIVED", "PROCESSING", "IN_PROGRESS"].includes(item.status),
      ).length,
      review: referrals.filter((item) =>
        ["NEEDS_REVIEW", "NEEDS_INFORMATION"].includes(item.status),
      ).length,
      ready: referrals.filter((item) => item.status === "READY_TO_ROUTE")
        .length,
      completed: referrals.filter((item) => item.status === "COMPLETED").length,
    }),
    [referrals],
  );

  async function uploadReferral(file: File) {
    setUploading(true);
    setError(null);
    try {
      const createResponse = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialty: "cardiology" }),
      });
      if (!createResponse.ok)
        throw new Error(await readApiError(createResponse));
      const created = (await createResponse.json()) as ReferralSummary;

      const form = new FormData();
      form.append("file", file);
      const uploadResponse = await fetch(
        `/api/referrals/${created.id}/documents`,
        {
          method: "POST",
          body: form,
        },
      );
      if (!uploadResponse.ok)
        throw new Error(await readApiError(uploadResponse));

      const processResponse = await fetch(
        `/api/referrals/${created.id}/process`,
        {
          method: "POST",
        },
      );
      if (!processResponse.ok)
        throw new Error(await readApiError(processResponse));
      router.push(`/referrals/${created.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The referral could not be uploaded. Try again.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headingRow}>
        <div>
          <p className={styles.context}>Referral intake</p>
          <h1>Work queue</h1>
          <p className={styles.summary}>
            Inspect evidence, resolve missing information, and route synthetic
            referrals.
          </p>
        </div>
        <div>
          <input
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={uploading}
            id="referral-file"
            onChange={(event) => {
              const [file] = Array.from(event.target.files ?? []);
              if (file) void uploadReferral(file);
            }}
            ref={fileInputRef}
            type="file"
          />
          <label
            aria-disabled={uploading}
            className={`button button-primary ${styles.uploadButton}`}
            htmlFor="referral-file"
          >
            <UploadIcon />
            {uploading ? "Processing referral…" : "Upload referral"}
          </label>
        </div>
      </div>

      <ProcessingContext />
      {error ? (
        <div className="inline-notice" data-tone="danger" role="alert">
          <span>{error}</span>
          <button
            className={styles.retry}
            onClick={() => void loadReferrals()}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section
        aria-label="Referral status summary"
        className={styles.statusStrip}
      >
        <div>
          <span>Active</span>
          <strong>{loading ? "…" : counts.active}</strong>
        </div>
        <div>
          <span>Needs attention</span>
          <strong>{loading ? "…" : counts.review}</strong>
        </div>
        <div>
          <span>Ready to route</span>
          <strong>{loading ? "…" : counts.ready}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{loading ? "…" : counts.completed}</strong>
        </div>
      </section>

      <section aria-labelledby="referrals-heading" className={styles.queue}>
        <div className={styles.queueHeading}>
          <div>
            <h2 id="referrals-heading">Referrals</h2>
            <p>{loading ? "Loading queue" : `${filtered.length} shown`}</p>
          </div>
          <div className={styles.filters}>
            <label className={styles.search}>
              <span className="sr-only">Search referrals</span>
              <SearchIcon />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ID, service, or queue"
                type="search"
                value={query}
              />
            </label>
            <label>
              <span className="sr-only">
                Filter by status and processing outcome
              </span>
              <select
                className={`select ${styles.statusSelect}`}
                onChange={(event) =>
                  setStatus(event.target.value as ReferralStatus | "ALL")
                }
                value={status}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by queue</span>
              <select
                className={`select ${styles.statusSelect}`}
                onChange={(event) => setQueue(event.target.value)}
                value={queue}
              >
                <option value="ALL">All queues</option>
                {queueOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by completeness</span>
              <select
                className={`select ${styles.statusSelect}`}
                onChange={(event) =>
                  setCompleteness(event.target.value as typeof completeness)
                }
                value={completeness}
              >
                <option value="ALL">All completeness</option>
                <option value="COMPLETE">Complete</option>
                <option value="INCOMPLETE">Incomplete</option>
              </select>
            </label>
          </div>
        </div>

        <div className={styles.tableFrame}>
          <table>
            <thead>
              <tr>
                <th scope="col">Referral</th>
                <th scope="col">Requested service</th>
                <th scope="col">Status</th>
                <th scope="col">Queue</th>
                <th scope="col">Updated</th>
                <th aria-label="Open referral" scope="col" />
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRows /> : null}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className={styles.empty} colSpan={6}>
                    <strong>No referrals match this view</strong>
                    <span>
                      Adjust the filters or upload a synthetic PDF to begin.
                    </span>
                  </td>
                </tr>
              ) : null}
              {!loading
                ? filtered.map((referral) => (
                    <tr key={referral.id}>
                      <td>
                        <Link
                          className={styles.referralLink}
                          href={`/referrals/${referral.id}`}
                        >
                          <strong>Referral {shortId(referral.id)}</strong>
                          <span className="mono">{referral.id}</span>
                        </Link>
                      </td>
                      <td>
                        {referral.requested_service ?? "Pending extraction"}
                      </td>
                      <td>
                        <StatusBadge status={referral.status} />
                      </td>
                      <td>{referral.routing_queue ?? "Unassigned"}</td>
                      <td>{formatTimestamp(referral.updated_at)}</td>
                      <td>
                        <Link
                          aria-label={`Open referral ${shortId(referral.id)}`}
                          className={`button button-quiet button-icon ${styles.openButton}`}
                          href={`/referrals/${referral.id}`}
                        >
                          <ArrowRightIcon />
                        </Link>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function LoadingRows() {
  return Array.from({ length: 4 }, (_, index) => (
    <tr aria-hidden="true" key={index}>
      <td>
        <div className={`skeleton ${styles.skeletonWide}`} />
      </td>
      <td>
        <div className={`skeleton ${styles.skeletonMedium}`} />
      </td>
      <td>
        <div className={`skeleton ${styles.skeletonShort}`} />
      </td>
      <td>
        <div className={`skeleton ${styles.skeletonMedium}`} />
      </td>
      <td>
        <div className={`skeleton ${styles.skeletonWide}`} />
      </td>
      <td />
    </tr>
  ));
}
