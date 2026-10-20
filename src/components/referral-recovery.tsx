"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import type { FieldSupplyRequest, ReferralDetail } from "@/lib/contracts";

import styles from "./referral-workspace.module.css";

export type ReferralAction = (
  key: string,
  url: string,
  init?: RequestInit,
) => Promise<boolean>;

export function fieldLabel(path: string): string {
  const labels: Record<string, string> = {
    "patient.full_name": "Patient name",
    "patient.date_of_birth": "Date of birth",
    "referring_provider.name": "Referring provider",
    requested_service: "Requested service",
    specialty: "Specialty",
  };
  return labels[path] ?? path.replaceAll("_", " ");
}

export function ReferralRecovery({
  referral,
  canReview,
  canIntake,
  working,
  onAction,
}: {
  referral: ReferralDetail;
  canReview: boolean;
  canIntake: boolean;
  working: string | null;
  onAction: ReferralAction;
}) {
  const [notice, setNotice] = useState("");
  const [classification, setClassification] = useState("supplemental");
  const recoverable = [
    "RECEIVED",
    "NEEDS_REVIEW",
    "NEEDS_INFORMATION",
    "FAILED",
  ].includes(referral.status);
  if (!recoverable) return null;
  const absent = referral.validation.missing_fields.filter(
    (path) => !referral.fields.some((field) => field.field_name === path),
  );
  const hasMissing =
    referral.validation.missing_fields.length > 0 ||
    referral.validation.missing_documents.length > 0;

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const form = event.currentTarget;
    const data = new FormData(form);
    if (
      await onAction("upload", `/api/referrals/${referral.id}/documents`, {
        body: data,
      })
    ) {
      form.reset();
      setClassification("supplemental");
      setNotice(
        "PDF uploaded. Reprocess the referral to check the new source.",
      );
    }
  }

  return (
    <section className={styles.recovery} aria-label="Information recovery">
      <h3>
        {hasMissing ? "Resolve missing information" : "Supporting documents"}
      </h3>
      {referral.status === "NEEDS_INFORMATION" ? (
        <p>
          Awaiting information. Follow up with the referrer through your usual
          channel, then add the response here.
        </p>
      ) : hasMissing ? (
        <p>
          Supply a confirmed missing value or add a supporting PDF to this
          referral.
        </p>
      ) : (
        <p>
          Review the proposed values below. Add another PDF if you need more
          evidence.
        </p>
      )}
      {canReview && hasMissing && referral.status === "NEEDS_REVIEW" ? (
        <div className={styles.recoveryRequest}>
          <button
            className="button button-secondary"
            disabled={working !== null}
            type="button"
            onClick={async () => {
              if (
                await onAction(
                  "request-information",
                  `/api/referrals/${referral.id}/request-information`,
                )
              ) {
                setNotice(
                  "Information request recorded. Contact the referrer through your usual channel.",
                );
              }
            }}
          >
            {working === "request-information"
              ? "Recording…"
              : "Record information request"}
          </button>
          <small>
            Records the missing items and places the referral on hold. No
            message is sent.
          </small>
        </div>
      ) : null}
      {canReview && absent.length > 0
        ? absent.map((path) => (
            <SupplyField
              key={path}
              path={path}
              referralId={referral.id}
              working={working}
              onAction={onAction}
            />
          ))
        : null}
      {canIntake && referral.status !== "FAILED" ? (
        <details className={styles.recoveryDetails}>
          <summary>Add a supporting PDF</summary>
          <form
            className={styles.recoveryForm}
            onSubmit={(event) => void upload(event)}
          >
            <label className="field">
              <span className="field-label">PDF document</span>
              <input
                className="input"
                name="file"
                type="file"
                accept="application/pdf,.pdf"
                required
                disabled={working !== null}
              />
            </label>
            <label className="field">
              <span className="field-label">Document type</span>
              <select
                className="input"
                name="classification"
                value={classification}
                onChange={(event) => setClassification(event.target.value)}
                disabled={working !== null}
              >
                {Array.from(
                  new Set([
                    "supplemental",
                    "referral_order",
                    ...referral.validation.missing_documents,
                  ]),
                ).map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button-secondary"
              type="submit"
              disabled={working !== null}
            >
              {working === "upload" ? "Uploading…" : "Upload PDF"}
            </button>
          </form>
        </details>
      ) : null}
      {canIntake && referral.documents.length > 0 ? (
        <button
          className="button button-secondary"
          type="button"
          disabled={working !== null}
          onClick={async () => {
            if (
              await onAction("process", `/api/referrals/${referral.id}/process`)
            )
              setNotice(
                "Referral reprocessed. Review the updated checks below.",
              );
          }}
        >
          {working === "process" ? "Processing…" : "Reprocess referral"}
        </button>
      ) : null}
      {notice ? (
        <p role="status" className={styles.recoveryNotice}>
          {notice}
        </p>
      ) : null}
    </section>
  );
}

function SupplyField({
  path,
  referralId,
  working,
  onAction,
}: {
  path: string;
  referralId: string;
  working: string | null;
  onAction: ReferralAction;
}) {
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAction(`supply:${path}`, `/api/referrals/${referralId}/fields`, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        field_path: path,
        value,
        reason,
      } satisfies FieldSupplyRequest),
    });
  }
  return (
    <details className={styles.recoveryDetails}>
      <summary>Supply {fieldLabel(path).toLowerCase()}</summary>
      <form
        className={styles.recoveryForm}
        onSubmit={(event) => void submit(event)}
      >
        <p>
          This value will be recorded as reviewer supplied, with your identity
          and reason.
        </p>
        <label className="field">
          <span className="field-label">{fieldLabel(path)}</span>
          <input
            className="input"
            type={path === "patient.date_of_birth" ? "date" : "text"}
            maxLength={500}
            required
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={working !== null}
          />
        </label>
        <label className="field">
          <span className="field-label">Source or confirmation reason</span>
          <textarea
            className="input"
            maxLength={500}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={working !== null}
          />
        </label>
        <button
          className="button button-primary"
          type="submit"
          disabled={!value.trim() || !reason.trim() || working !== null}
        >
          {working === `supply:${path}` ? "Saving…" : "Save supplied value"}
        </button>
      </form>
    </details>
  );
}
