"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import type {
  AuditEvent,
  CurrentUser,
  EvidenceReference,
  ExtractedField,
  FhirBundle,
  ReferralDetail,
} from "@/lib/contracts";
import { readApiError } from "@/lib/api-error";

import { AlertIcon, CheckIcon, ChevronLeftIcon, EvidenceIcon } from "./icons";
import {
  ReferralRecovery,
  fieldLabel,
  type ReferralAction,
} from "./referral-recovery";
import { StatusBadge } from "./status-badge";
import { SourceDocumentViewer } from "./source-document-viewer";
import { ProcessingContext } from "./processing-context";

import styles from "./referral-workspace.module.css";

type WorkspaceTab = "review" | "fhir" | "audit";

interface ReferralWorkspaceProps {
  referralId: string;
}

interface WorkspacePayload {
  referral: ReferralDetail;
  fhir: FhirBundle | null;
  audit: AuditEvent[];
}

function shortId(value: string): string {
  return value.slice(0, 8).toUpperCase();
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ReferralWorkspace({ referralId }: ReferralWorkspaceProps) {
  const router = useRouter();
  const [payload, setPayload] = useState<WorkspacePayload | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("review");
  const [selectedEvidence, setSelectedEvidence] =
    useState<EvidenceReference | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setError(null);
    try {
      const referralResponse = await fetch(`/api/referrals/${referralId}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (referralResponse.status === 401) {
        router.replace(
          `/login?returnTo=${encodeURIComponent(`/referrals/${referralId}`)}`,
        );
        return;
      }
      if (!referralResponse.ok)
        throw new Error(await readApiError(referralResponse));
      const referral = (await referralResponse.json()) as ReferralDetail;

      const [fhirResponse, auditResponse, sessionResponse] = await Promise.all([
        fetch(`/api/referrals/${referralId}/fhir`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
        fetch(`/api/referrals/${referralId}/audit`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
        fetch("/api/session", { cache: "no-store" }),
      ]);

      if (fhirResponse.status === 401 || auditResponse.status === 401) {
        router.replace(
          `/login?returnTo=${encodeURIComponent(`/referrals/${referralId}`)}`,
        );
        return;
      }

      const auxiliaryErrors: string[] = [];
      const fhir = fhirResponse.ok
        ? ((await fhirResponse.json()) as FhirBundle)
        : (auxiliaryErrors.push(
            `FHIR preview: ${await readApiError(fhirResponse)}`,
          ),
          null);
      const audit = auditResponse.ok
        ? ((await auditResponse.json()) as AuditEvent[])
        : (auxiliaryErrors.push(
            `Audit history: ${await readApiError(auditResponse)}`,
          ),
          []);
      setUser(
        sessionResponse.ok
          ? ((await sessionResponse.json()) as CurrentUser)
          : null,
      );
      setPayload({ referral, fhir, audit });
      if (auxiliaryErrors.length > 0) setError(auxiliaryErrors.join(" "));
      setSelectedEvidence(
        (current) => current ?? referral.fields[0]?.evidence[0] ?? null,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The referral workspace could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [referralId, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWorkspace(), 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  useEffect(() => {
    if (payload?.referral.status !== "PROCESSING") return;
    const timer = window.setInterval(() => void loadWorkspace(), 2500);
    return () => window.clearInterval(timer);
  }, [loadWorkspace, payload?.referral.status]);

  const selectedDocument = useMemo(() => {
    if (!payload) return null;
    if (selectedEvidence) {
      return (
        payload.referral.documents.find(
          (document) => document.id === selectedEvidence.document_id,
        ) ??
        payload.referral.documents[0] ??
        null
      );
    }
    return payload.referral.documents[0] ?? null;
  }, [payload, selectedEvidence]);

  async function runAction(key: string, url: string, init?: RequestInit) {
    setWorking(key);
    setError(null);
    try {
      const response = await fetch(url, { method: "POST", ...init });
      if (!response.ok) throw new Error(await readApiError(response));
      await loadWorkspace();
      return true;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The action failed.",
      );
      return false;
    } finally {
      setWorking(null);
    }
  }

  function moveTab(
    event: KeyboardEvent<HTMLButtonElement>,
    current: WorkspaceTab,
  ) {
    const order: WorkspaceTab[] = ["review", "fhir", "audit"];
    const currentIndex = order.indexOf(current);
    let next: WorkspaceTab | undefined;
    if (event.key === "ArrowRight")
      next = order[(currentIndex + 1) % order.length];
    if (event.key === "ArrowLeft")
      next = order[(currentIndex - 1 + order.length) % order.length];
    if (event.key === "Home") next = order[0];
    if (event.key === "End") next = order.at(-1);
    if (!next) return;
    event.preventDefault();
    setTab(next);
    document.getElementById(`${next}-tab`)?.focus();
  }

  if (loading) return <WorkspaceLoading />;

  if (!payload) {
    return (
      <div className={styles.unavailable}>
        <AlertIcon />
        <h1>Referral unavailable</h1>
        <p>
          {error ??
            "This referral could not be found or is outside your organization."}
        </p>
        <Link className="button button-secondary" href="/">
          Return to work queue
        </Link>
      </div>
    );
  }

  const { audit, fhir, referral } = payload;
  const canReview =
    user?.roles.some((role) =>
      ["reviewer", "supervisor", "administrator"].includes(role),
    ) ?? false;
  const canIntake =
    user?.roles.some((role) =>
      ["intake_specialist", "administrator", "service"].includes(role),
    ) ?? false;
  const unresolved = referral.fields.filter(
    (field) => !["VERIFIED", "HUMAN_CORRECTED"].includes(field.evidence_status),
  ).length;

  return (
    <div className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <div className={styles.breadcrumbRow}>
          <Link className={styles.backLink} href="/">
            <ChevronLeftIcon />
            Work queue
          </Link>
          <span aria-hidden="true">/</span>
          <span className="mono">{shortId(referral.id)}</span>
        </div>
        <div className={styles.titleRow}>
          <div>
            <div className={styles.titleLine}>
              <h1>Referral {shortId(referral.id)}</h1>
              <StatusBadge status={referral.status} />
            </div>
            <p>
              {referral.requested_service ?? "Requested service pending"}
              <span aria-hidden="true"> · </span>
              Updated {formatTimestamp(referral.updated_at)}
            </p>
          </div>
          <button
            className="button button-primary"
            disabled={
              !canReview ||
              referral.status !== "READY_TO_ROUTE" ||
              working !== null
            }
            onClick={() =>
              void runAction("route", `/api/referrals/${referralId}/route`)
            }
            type="button"
          >
            {working === "route" ? "Routing…" : "Route referral"}
          </button>
        </div>
        <nav
          aria-label="Referral sections"
          className={styles.tabs}
          role="tablist"
        >
          <TabButton
            active={tab === "review"}
            controls="review-panel"
            id="review-tab"
            onClick={() => setTab("review")}
            onKeyDown={(event) => moveTab(event, "review")}
          >
            Review
            {unresolved > 0 ? <span>{unresolved}</span> : null}
          </TabButton>
          <TabButton
            active={tab === "fhir"}
            controls="fhir-panel"
            id="fhir-tab"
            onClick={() => setTab("fhir")}
            onKeyDown={(event) => moveTab(event, "fhir")}
          >
            FHIR preview
          </TabButton>
          <TabButton
            active={tab === "audit"}
            controls="audit-panel"
            id="audit-tab"
            onClick={() => setTab("audit")}
            onKeyDown={(event) => moveTab(event, "audit")}
          >
            Audit history
            <span>{audit.length}</span>
          </TabButton>
        </nav>
      </header>

      {error ? (
        <div
          className={`${styles.actionError} inline-notice`}
          data-tone="danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {tab === "review" ? (
        <div
          aria-labelledby="review-tab"
          className={styles.reviewLayout}
          id="review-panel"
          role="tabpanel"
        >
          <SourcePanel
            document={selectedDocument}
            evidence={selectedEvidence}
            referralId={referral.id}
          />
          <ReviewPanel
            canReview={canReview}
            canIntake={canIntake}
            onAction={runAction}
            onSelectEvidence={setSelectedEvidence}
            referral={referral}
            selectedEvidence={selectedEvidence}
            working={working}
          />
        </div>
      ) : null}

      {tab === "fhir" ? <FhirPanel bundle={fhir} /> : null}
      {tab === "audit" ? <AuditPanel events={audit} /> : null}
    </div>
  );
}

function TabButton({
  active,
  children,
  controls,
  id,
  onClick,
  onKeyDown,
}: {
  active: boolean;
  children: ReactNode;
  controls: string;
  id: string;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      aria-controls={controls}
      aria-selected={active}
      id={id}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role="tab"
      tabIndex={active ? 0 : -1}
      type="button"
    >
      {children}
    </button>
  );
}

function SourcePanel({
  document,
  evidence,
  referralId,
}: {
  document: ReferralDetail["documents"][number] | null;
  evidence: EvidenceReference | null;
  referralId: string;
}) {
  if (!document) {
    return (
      <section className={styles.sourcePanel}>
        <div className={styles.panelHeading}>
          <h2>Source document</h2>
        </div>
        <div className={styles.sourceEmpty}>
          No source document is available.
        </div>
      </section>
    );
  }

  return (
    <SourceDocumentViewer
      key={`${document.id}-${evidence?.block_id ?? "first"}`}
      document={document}
      evidence={evidence}
      referralId={referralId}
    />
  );
}

function ReviewPanel({
  canReview,
  canIntake,
  onAction,
  onSelectEvidence,
  referral,
  selectedEvidence,
  working,
}: {
  onAction: ReferralAction;
  onSelectEvidence: (evidence: EvidenceReference) => void;
  referral: ReferralDetail;
  canReview: boolean;
  canIntake: boolean;
  selectedEvidence: EvidenceReference | null;
  working: string | null;
}) {
  return (
    <section className={styles.reviewPanel}>
      <ProcessingContext />
      <div className={styles.panelHeading}>
        <div>
          <h2>Structured referral</h2>
          <p>AI-proposed values remain separate from reviewer changes.</p>
        </div>
      </div>

      <CompletenessSummary referral={referral} />
      <DocumentChecklist documents={referral.documents} />
      <ReferralRecovery
        referral={referral}
        canReview={canReview}
        canIntake={canIntake}
        working={working}
        onAction={onAction}
      />

      <div className={styles.fieldList}>
        {referral.fields.map((field) => (
          <FieldReview
            canReview={
              canReview &&
              ["NEEDS_REVIEW", "NEEDS_INFORMATION", "READY_TO_ROUTE"].includes(
                referral.status,
              )
            }
            field={field}
            key={field.id}
            onAction={onAction}
            onSelectEvidence={onSelectEvidence}
            referralId={referral.id}
            selectedEvidence={selectedEvidence}
            working={working}
          />
        ))}
      </div>

      {referral.fields.length === 0 ? (
        <div className={styles.reviewEmpty}>
          <strong>No extracted fields yet</strong>
          <span>
            The processing pipeline will place verified proposals here.
          </span>
        </div>
      ) : null}
    </section>
  );
}

function CompletenessSummary({ referral }: { referral: ReferralDetail }) {
  const { validation } = referral;
  const unresolvedIssues = referral.validation_issues.filter(
    (issue, index, issues) =>
      !issue.resolved &&
      !issues
        .slice(0, index)
        .some(
          (earlier) => !earlier.resolved && earlier.message === issue.message,
        ),
  );
  const uncoveredWarnings = validation.warnings.filter(
    (warning) => !unresolvedIssues.some((issue) => issue.code === warning),
  );
  return (
    <div
      className={styles.completeness}
      data-complete={validation.complete || undefined}
    >
      <div className={styles.completenessTitle}>
        {validation.complete ? <CheckIcon /> : <AlertIcon />}
        <div>
          <strong>
            {validation.complete
              ? "Required information present"
              : "Review required"}
          </strong>
          <span>
            {validation.complete
              ? "Deterministic completeness checks passed."
              : "Review proposed values and resolve missing items before routing."}
          </span>
        </div>
      </div>
      {!validation.complete ? (
        <div className={styles.issueGroups}>
          {(validation.pending_review_fields?.length ?? 0) > 0 ? (
            <div>
              <span>Values awaiting review</span>
              <ul>
                {validation.pending_review_fields?.map((field) => (
                  <li key={field}>{fieldLabel(field)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {validation.missing_fields.length > 0 ? (
            <div>
              <span>Missing fields</span>
              <ul>
                {validation.missing_fields.map((field) => (
                  <li key={field}>{fieldLabel(field)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {validation.missing_documents.length > 0 ? (
            <div>
              <span>Missing documents</span>
              <ul>
                {validation.missing_documents.map((document) => (
                  <li key={document}>{document}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {uncoveredWarnings.length > 0 ? (
            <div>
              <span>Warnings</span>
              <ul>
                {uncoveredWarnings.map((warning) => (
                  <li key={warning}>{fieldLabel(warning)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {unresolvedIssues.length > 0 ? (
            <div>
              <span>Validation issues</span>
              <ul>
                {unresolvedIssues.map((issue) => (
                  <li data-severity={issue.severity} key={issue.id}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DocumentChecklist({
  documents,
}: {
  documents: ReferralDetail["documents"];
}) {
  return (
    <section
      aria-labelledby="document-checklist-heading"
      className={styles.documentChecklist}
    >
      <div>
        <strong id="document-checklist-heading">Document checklist</strong>
        <span>{documents.length} attached</span>
      </div>
      {documents.length > 0 ? (
        <ul>
          {documents.map((document) => (
            <li key={document.id}>
              {document.processing_state === "EXTRACTED" ? (
                <CheckIcon />
              ) : (
                <AlertIcon />
              )}
              <span>
                <strong>{document.original_filename}</strong>
                <small>
                  {document.classification.replaceAll("_", " ")} ·{" "}
                  {document.page_count} page
                  {document.page_count === 1 ? "" : "s"}
                </small>
              </span>
              <em data-state={document.processing_state}>
                {document.processing_state.toLowerCase()}
              </em>
            </li>
          ))}
        </ul>
      ) : (
        <p>No referral documents are attached.</p>
      )}
    </section>
  );
}

function FieldReview({
  canReview,
  field,
  onAction,
  onSelectEvidence,
  referralId,
  selectedEvidence,
  working,
}: {
  field: ExtractedField;
  canReview: boolean;
  onAction: ReferralAction;
  onSelectEvidence: (evidence: EvidenceReference) => void;
  referralId: string;
  selectedEvidence: EvidenceReference | null;
  working: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    field.reviewed_value ?? field.ai_value ?? "",
  );
  const [reason, setReason] = useState("");
  const actionKey = `field:${field.id}`;
  const displayedValue = field.reviewed_value ?? field.ai_value;
  const percent = Math.round(field.confidence * 100);

  async function saveCorrection() {
    const saved = await onAction(
      actionKey,
      `/api/referrals/${referralId}/fields/${field.id}/correct`,
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, reason: reason || null }),
      },
    );
    if (saved) setEditing(false);
  }

  return (
    <article className={styles.fieldRow}>
      <div className={styles.fieldHeader}>
        <div>
          <h3>{fieldLabel(field.field_name)}</h3>
          <span className={styles.fieldPath}>{field.field_name}</span>
        </div>
        <div className={styles.fieldStates}>
          <span data-state={field.evidence_status}>
            {field.evidence_status.replaceAll("_", " ")}
          </span>
          {field.ai_value === null ? (
            <span>Reviewer supplied</span>
          ) : (
            <span>{percent}% confidence</span>
          )}
        </div>
      </div>

      {editing ? (
        <div className={styles.correctionForm}>
          <label className="field">
            <span className="field-label">Corrected value</span>
            <input
              autoFocus
              className="input"
              onChange={(event) => setValue(event.target.value)}
              value={value}
            />
          </label>
          <label className="field">
            <span className="field-label">
              {field.evidence_status === "CONFLICTING"
                ? "Resolution reason"
                : "Reason (optional)"}
            </span>
            <input
              className="input"
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              required={field.evidence_status === "CONFLICTING"}
              placeholder="Why is this value changing?"
              value={reason}
            />
          </label>
          <div className={styles.formActions}>
            <button
              className="button button-primary"
              disabled={
                !value.trim() ||
                (field.evidence_status === "CONFLICTING" && !reason.trim()) ||
                working !== null
              }
              onClick={() => void saveCorrection()}
              type="button"
            >
              {working === actionKey ? "Saving…" : "Save correction"}
            </button>
            <button
              className="button button-quiet"
              disabled={working !== null}
              onClick={() => setEditing(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.valueBlock}>
            <span className={styles.currentValue}>
              {displayedValue || "No value extracted"}
            </span>
            {field.reviewed_value !== null && field.ai_value !== null ? (
              <span className={styles.originalValue}>
                AI proposal: {field.ai_value ?? "None"}
              </span>
            ) : null}
            {field.reviewer_id && field.reviewed_at ? (
              <span className={styles.originalValue}>
                Reviewed by {field.reviewer_id} ·{" "}
                {formatTimestamp(field.reviewed_at)}
              </span>
            ) : null}
            {field.review_reason ? (
              <span className={styles.originalValue}>
                Reason: {field.review_reason}
              </span>
            ) : null}
          </div>
          {field.evidence_status === "CONFLICTING" ? (
            <div className={styles.conflictingSources}>
              <strong>
                Sources disagree. Confirm the correct value and record a
                resolution reason.
              </strong>
              <ul>
                {field.evidence.map((evidence, index) => (
                  <li
                    key={`${evidence.document_id}-${evidence.block_id}-${index}`}
                  >
                    <blockquote>{evidence.quote}</blockquote>
                    <button
                      className="button button-quiet"
                      type="button"
                      onClick={() => onSelectEvidence(evidence)}
                    >
                      Inspect source {index + 1}, page {evidence.page}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className={styles.fieldActions}>
            <div className={styles.evidenceButtons}>
              {field.evidence.map((evidence, index) => {
                const selected =
                  selectedEvidence?.block_id === evidence.block_id &&
                  selectedEvidence?.document_id === evidence.document_id;
                return (
                  <button
                    aria-pressed={selected}
                    className={styles.evidenceButton}
                    data-selected={selected || undefined}
                    key={`${evidence.block_id}-${index}`}
                    onClick={() => onSelectEvidence(evidence)}
                    type="button"
                  >
                    <EvidenceIcon />
                    Page {evidence.page} evidence
                  </button>
                );
              })}
            </div>
            <div className={styles.reviewActions}>
              <button
                className="button button-quiet"
                disabled={!canReview || working !== null}
                onClick={() => {
                  setValue(field.reviewed_value ?? field.ai_value ?? "");
                  setEditing(true);
                }}
                type="button"
              >
                Correct value
              </button>
              <button
                className="button button-secondary"
                disabled={
                  !canReview ||
                  !["VERIFIED", "LOW_CONFIDENCE", "REVIEW_REQUIRED"].includes(
                    field.evidence_status,
                  ) ||
                  field.review_status === "APPROVED" ||
                  working !== null
                }
                onClick={() =>
                  void onAction(
                    actionKey,
                    `/api/referrals/${referralId}/fields/${field.id}/approve`,
                    {
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                    },
                  )
                }
                type="button"
              >
                <CheckIcon />
                {field.review_status === "APPROVED"
                  ? "Approved"
                  : "Approve value"}
              </button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}

function FhirPanel({ bundle }: { bundle: FhirBundle | null }) {
  return (
    <section
      aria-labelledby="fhir-tab"
      className={styles.singlePanel}
      id="fhir-panel"
      role="tabpanel"
    >
      <div className={styles.singlePanelHeading}>
        <div>
          <h2>FHIR R4 preview</h2>
          <p>
            Generated from verified and reviewed values. Previewing does not
            write resources.
          </p>
        </div>
        {bundle ? (
          <span className={styles.resourceCount}>
            {bundle.entry.length} resources
          </span>
        ) : null}
      </div>
      {bundle ? (
        <pre className={styles.fhirCode}>{JSON.stringify(bundle, null, 2)}</pre>
      ) : (
        <div className={styles.reviewEmpty}>
          <strong>FHIR preview unavailable</strong>
          <span>
            Resolve validation issues before generating interoperable resources.
          </span>
        </div>
      )}
    </section>
  );
}

function AuditPanel({ events }: { events: AuditEvent[] }) {
  return (
    <section
      aria-labelledby="audit-tab"
      className={styles.singlePanel}
      id="audit-panel"
      role="tabpanel"
    >
      <div className={styles.singlePanelHeading}>
        <div>
          <h2>Audit history</h2>
          <p>Durable application events, separate from operational logs.</p>
        </div>
        <span className={styles.chainState}>
          <CheckIcon /> Hash-linked sequence
        </span>
      </div>
      {events.length > 0 ? (
        <ol className={styles.timeline}>
          {events.map((event) => (
            <li key={event.id}>
              <span aria-hidden="true" className={styles.timelineMark} />
              <div>
                <div className={styles.eventTitle}>
                  <strong>{event.action.replaceAll("_", " ")}</strong>
                  <time dateTime={event.timestamp}>
                    {formatTimestamp(event.timestamp)}
                  </time>
                </div>
                <p>
                  {event.actor_id} · {event.resource_type}{" "}
                  {shortId(event.resource_id)}
                </p>
                <span className="mono">Trace {event.trace_id}</span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.reviewEmpty}>
          <strong>No audit events returned</strong>
          <span>Event history will appear as the referral changes.</span>
        </div>
      )}
    </section>
  );
}

function WorkspaceLoading() {
  return (
    <div aria-label="Loading referral workspace" className={styles.loading}>
      <div>
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <div>
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </div>
  );
}
