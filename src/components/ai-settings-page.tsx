"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { AIProviderName, PersonalAISettings } from "@/lib/contracts";
import { readApiError } from "@/lib/api-error";
import styles from "./ai-settings-page.module.css";

const providers: Record<AIProviderName, string> = {
  ollama: "Ollama",
  openai: "OpenAI",
  gemini: "Gemini",
};

export function AISettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PersonalAISettings | null>(null);
  const [provider, setProvider] = useState<AIProviderName>("ollama");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const mounted = useRef(true);

  const accept = useCallback((data: PersonalAISettings) => {
    setSettings(data);
    const selected =
      data.configuration.ai_provider === "fixture"
        ? "ollama"
        : data.configuration.ai_provider;
    setProvider(selected);
    setModel(
      data.models[selected] ||
        (data.configuration.ai_provider === selected
          ? (data.configuration.ai_model ?? "")
          : ""),
    );
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch("/api/settings/ai", {
          cache: "no-store",
          signal,
        });
        if (response.status === 401) {
          router.replace("/login?returnTo=%2Fsettings");
          return;
        }
        if (!response.ok) throw new Error(await readApiError(response));
        accept((await response.json()) as PersonalAISettings);
      } catch (failure) {
        if (!signal?.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Settings could not be loaded.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [accept, router],
  );

  useEffect(() => {
    const controller = new AbortController();
    mounted.current = true;
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      mounted.current = false;
    };
  }, [load]);

  const hasKey =
    provider !== "ollama" && settings?.configured_keys.includes(provider);
  const hosted = provider !== "ollama";
  const keyMissing = hosted && !hasKey && !apiKey;

  async function mutate(path: string, payload: object, message: string) {
    setWorking(true);
    setError("");
    setNotice("");
    setApiKey("");
    try {
      const response = await fetch(`/api/settings/ai${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        router.replace("/login?returnTo=%2Fsettings");
        return;
      }
      if (!response.ok) throw new Error(await readApiError(response));
      const data = (await response.json()) as PersonalAISettings;
      if (mounted.current) {
        accept(data);
        setNotice(message);
      }
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Settings could not be saved.",
        );
    } finally {
      if (mounted.current) setWorking(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    void mutate(
      "",
      {
        revision: settings.revision,
        provider,
        model,
        ...(apiKey ? { api_key: apiKey } : {}),
      },
      "Settings saved. New processing runs use your selection. Saved keys are not checked with the provider.",
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <h1>AI settings</h1>
        <p>
          Choose the model used when you process referrals. These settings apply
          only to your account in this organization.
        </p>
      </header>
      {error ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button button-secondary"
            disabled={working}
            onClick={() => {
              setApiKey("");
              setLoading(true);
              setError("");
              void load();
            }}
          >
            Reload settings
          </button>
        </div>
      ) : null}
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {loading ? (
        <div aria-label="Loading AI settings" className={styles.loading}>
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : settings ? (
        <>
          <div
            className={styles.current}
            aria-label="Active processing configuration"
          >
            <span>
              {settings.using_defaults
                ? "Using deployment defaults"
                : "Using your selection"}
            </span>
            <strong>
              {settings.configuration.ai_provider === "fixture"
                ? "Deterministic fixtures"
                : providers[settings.configuration.ai_provider]}
              {settings.configuration.ai_model
                ? ` · ${settings.configuration.ai_model}`
                : ""}
            </strong>
            <small>
              Existing extractions stay unchanged. All real-model proposals
              require review.
            </small>
          </div>
          <form className={styles.form} onSubmit={submit}>
            <fieldset disabled={working}>
              <legend>Extraction provider</legend>
              <label htmlFor="ai-provider" className="field-label">
                Provider
              </label>
              <select
                className="select"
                id="ai-provider"
                value={provider}
                onChange={(event) => {
                  const next = event.target.value as AIProviderName;
                  setProvider(next);
                  setModel(settings.models[next]);
                  setApiKey("");
                  setNotice("");
                }}
              >
                <option value="ollama">Ollama</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
              <p className={styles.hint}>
                {hosted
                  ? `Extracted document text will be sent to ${providers[provider]} using your key. Check your organization’s data-sharing policy before processing.`
                  : "Uses the Ollama server configured by your administrator. No personal API key is needed."}
              </p>
              <label htmlFor="ai-model" className="field-label">
                Model name
              </label>
              <input
                className="input"
                id="ai-model"
                value={model}
                required
                maxLength={150}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setModel(event.target.value)}
                aria-describedby="model-help"
              />
              <p id="model-help" className={styles.hint}>
                {hosted
                  ? "Enter a model available to your provider account that supports structured output."
                  : "Enter the name of a model already installed on the configured Ollama server."}
              </p>
              {hosted ? (
                <div className={styles.credentials}>
                  <div className={styles.keyStatus}>
                    <strong>Personal API key</strong>
                    <span>{hasKey ? "Key saved" : "No key saved"}</span>
                  </div>
                  {!settings.credential_storage_available ? (
                    <p role="alert">
                      Secure key storage is unavailable. Ask your administrator
                      to configure it.
                    </p>
                  ) : null}
                  <label htmlFor="provider-api-key" className="field-label">
                    {hasKey ? "Replace API key" : "API key"}
                  </label>
                  <input
                    className="input"
                    id="provider-api-key"
                    type="password"
                    autoComplete="new-password"
                    spellCheck={false}
                    autoCapitalize="none"
                    value={apiKey}
                    minLength={8}
                    maxLength={2048}
                    disabled={!settings.credential_storage_available}
                    onChange={(event) => setApiKey(event.target.value)}
                    aria-describedby="key-help"
                  />
                  <p id="key-help" className={styles.hint}>
                    Keys are encrypted on the backend and never returned to this
                    page.
                    {hasKey
                      ? " Leave blank to keep your saved key."
                      : " A key is required for this provider."}{" "}
                    The field clears after a save attempt.
                  </p>
                  {hasKey ? (
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() =>
                        void mutate(
                          "/remove-key",
                          { provider, revision: settings.revision },
                          "API key removed. Processing with this personal provider is blocked until you add a key or choose another provider.",
                        )
                      }
                    >
                      Remove saved key
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className={styles.actions}>
                <button
                  className="button button-primary"
                  disabled={
                    keyMissing ||
                    !model.trim() ||
                    (hosted && !settings.credential_storage_available)
                  }
                  type="submit"
                >
                  {working ? "Saving…" : "Save settings"}
                </button>
                {!settings.using_defaults ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() =>
                      void mutate(
                        "/use-defaults",
                        { revision: settings.revision },
                        "Deployment defaults restored. Your saved keys remain available until you remove them.",
                      )
                    }
                  >
                    Use deployment defaults
                  </button>
                ) : null}
              </div>
            </fieldset>
          </form>
          <section className={styles.boundary} aria-label="Settings scope">
            <h2>Your account, your credentials</h2>
            <p>
              Other users cannot use your saved keys. Your selection applies to
              processing actions you start, including reprocessing a referral.
              Source evidence, required review, and routing checks still apply.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
