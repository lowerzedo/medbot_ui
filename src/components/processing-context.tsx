"use client";

import { useEffect, useState } from "react";
import type { ProcessingConfiguration } from "@/lib/contracts";
import styles from "./referral-workspace.module.css";

export function ProcessingContext() {
  const [config, setConfig] = useState<ProcessingConfiguration | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/processing-configuration", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.ok)
          setConfig((await response.json()) as ProcessingConfiguration);
      })
      .catch(() => {
        /* Optional context; the processing action still reports provider failures. */
      });
    return () => controller.abort();
  }, []);
  if (!config) return null;
  const provider = {
    fixture: "Deterministic fixture extraction",
    ollama: "Local Ollama",
    openai: "OpenAI",
    gemini: "Gemini",
  }[config.ai_provider];
  return (
    <aside
      className={styles.processingContext}
      aria-label="Document processing provider"
    >
      <strong>
        {config.document_extractor === "pdfium-tesseract"
          ? "PDF text + local OCR"
          : "Fixture PDF reader"}{" "}
        · {provider}
        {config.ai_model ? ` (${config.ai_model})` : ""}
      </strong>
      <span>
        {config.hosted
          ? "Processing sends extracted text to this hosted provider. All AI proposals require review."
          : config.ai_provider === "ollama"
            ? "Document text stays with the configured local model. All AI proposals require review."
            : "Fixture mode uses deterministic extraction. OCR-derived values still require review."}
      </span>
    </aside>
  );
}
