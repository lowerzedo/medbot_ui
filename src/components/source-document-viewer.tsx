"use client";

import { useState } from "react";

import type { DocumentSummary, EvidenceReference } from "@/lib/contracts";
import { EvidenceIcon, ExternalLinkIcon } from "./icons";
import styles from "./referral-workspace.module.css";

export function SourceDocumentViewer({
  document,
  evidence,
  referralId,
}: {
  document: DocumentSummary;
  evidence: EvidenceReference | null;
  referralId: string;
}) {
  const [page, setPage] = useState(evidence?.page ?? 1);
  const [imageFailed, setImageFailed] = useState(false);
  const sourceUrl = `/api/referrals/${referralId}/documents/${document.id}/content#page=${page}`;
  const imageUrl = `/api/referrals/${referralId}/documents/${document.id}/pages/${page}/image`;
  const located = Boolean(evidence?.region);
  const selectedRegion = page === evidence?.page ? evidence.region : null;
  return (
    <section className={styles.sourcePanel} aria-label="Source evidence">
      <div className={styles.panelHeading}>
        <div>
          <h2>Source document</h2>
          <p>{document.original_filename}</p>
        </div>
        <a
          aria-label="Open source PDF in a new tab"
          className="button button-quiet button-icon"
          href={sourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLinkIcon />
        </a>
      </div>
      {located ? (
        <nav className={styles.pageControls} aria-label="Source pages">
          <button
            className="button button-secondary"
            disabled={page <= 1}
            onClick={() => {
              setPage(page - 1);
              setImageFailed(false);
            }}
            type="button"
          >
            Previous page
          </button>
          <span>
            Page {page} of {document.page_count}
          </span>
          <button
            className="button button-secondary"
            disabled={page >= document.page_count}
            onClick={() => {
              setPage(page + 1);
              setImageFailed(false);
            }}
            type="button"
          >
            Next page
          </button>
        </nav>
      ) : null}
      <div className={styles.documentViewport}>
        {located ? (
          imageFailed ? (
            <p role="alert">
              The page preview could not be loaded.{" "}
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                Open the source PDF
              </a>{" "}
              to inspect the evidence.
            </p>
          ) : (
            <div className={styles.sourcePage}>
              {/* The authenticated same-origin image endpoint enforces referral and document scope. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`Source document, page ${page}`}
                key={imageUrl}
                src={imageUrl}
                onError={() => setImageFailed(true)}
              />
              {selectedRegion ? (
                <span
                  role="img"
                  aria-label="Selected evidence region"
                  className={styles.sourceRegion}
                  style={{
                    left: `${selectedRegion.x * 100}%`,
                    top: `${selectedRegion.y * 100}%`,
                    width: `${selectedRegion.width * 100}%`,
                    height: `${selectedRegion.height * 100}%`,
                  }}
                />
              ) : null}
            </div>
          )
        ) : (
          <iframe
            key={`${document.id}-${page}`}
            src={sourceUrl}
            title="Source PDF"
          />
        )}
      </div>
      {evidence ? (
        <div aria-live="polite" className={styles.evidenceFocus}>
          <div>
            <EvidenceIcon />
            <strong>Selected evidence, page {evidence.page}</strong>
          </div>
          <blockquote>“{evidence.quote}”</blockquote>
          {evidence.extraction_method === "ocr" ? (
            <p className={styles.ocrNotice}>
              OCR text matched. Compare the highlighted region with the scan
              before approving.
              {evidence.ocr_confidence != null
                ? ` OCR engine confidence: ${Math.round(evidence.ocr_confidence * 100)}%.`
                : ""}
            </p>
          ) : (
            <p>Quoted text matched to the source.</p>
          )}
          {page !== evidence.page ? (
            <button
              className="button button-secondary"
              onClick={() => {
                setPage(evidence.page);
                setImageFailed(false);
              }}
              type="button"
            >
              Show selected evidence
            </button>
          ) : null}
          <span className="mono">Block {evidence.block_id}</span>
        </div>
      ) : null}
    </section>
  );
}
