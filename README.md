# MedBot UI

Operational Next.js interface for the MedBot referral-processing platform. This repository owns the dashboard, evidence-linked reviewer workspace, field review actions, FHIR preview, audit timeline, and browser-facing authentication session. Backend policy and tenant authorization remain in the sibling `medbot` API.

Only synthetic data is supported in this Phase 0 + Phase 1 implementation.

## Requirements

- Node.js 24 LTS
- npm (the committed `package-lock.json` is authoritative)
- the sibling `medbot` API for live local use

## Start locally

Start the backend stack from the sibling repository first:

```bash
cd ../medbot
make dev
```

Then start the UI:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`. Local development uses the Keycloak realm started by the backend
Compose stack. The all-role synthetic login is:

- Username: `synthetic-admin-alpha`
- Password: `local-only-admin-password`

Development-token authentication remains available only through an explicit
`MEDBOT_AUTH_MODE=dev` override. In that mode, the fixed local bearer token stays on the Next.js
server and is never exposed to browser JavaScript. Production refuses development-token
authentication and requires an explicit OIDC configuration plus a strong session secret.

## Commands

| Command                | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Start the development server                |
| `npm run build`        | Create the production standalone build      |
| `npm run lint`         | Run the Next.js ESLint rules                |
| `npm run typecheck`    | Run strict TypeScript checks                |
| `npm test`             | Run deterministic unit tests                |
| `npm run test:e2e`     | Run the mocked Playwright reviewer journeys |
| `npm run format:check` | Check Prettier formatting                   |

## Security boundary

- Browser requests use the same-origin `/api` BFF. The BFF has a method/path allowlist and never forwards client-supplied authorization or organization headers.
- OIDC uses authorization code with PKCE and state. Tokens are held in encrypted, `HttpOnly`, `SameSite=Lax` cookies, refreshed server-side, and bounded by an eight-hour application session.
- Mutations reject untrusted browser origins. Request bodies are bounded before proxying, and backend responses are `private, no-store`.
- The backend remains authoritative for roles, tenant scope, workflow transitions, evidence verification, completeness, routing, FHIR writes, and audit records.
- Patient/document content is never sent to ordinary logs, URLs, metrics labels, or client-side storage.

See [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md) for the product and interface decisions.

## Missing-information recovery

The referral workspace supports recording an information request, supplying an absent required field
with a confirmation reason, attaching supplemental PDFs, and reprocessing the same referral. These
are inline forms using the existing design system. Failed saves preserve the form contents.

Reviewer-supplied values show their origin, reviewer, timestamp, and reason. Conflicting source values
are displayed together; approval is disabled until a reviewer records an explained correction.
All authorization, completeness, evidence, and state decisions remain in the backend. Upload/process
controls use intake permissions; supply/request/correction controls use review permissions.
An information request records follow-up intent and missing items; it does not send a message.

## Real API browser checks

Start the synthetic API from the backend repository:

```bash
uv run --extra dev python scripts/run_synthetic_e2e_api.py
```

Then run from this repository (with no other Next.js development server running):

```bash
MEDBOT_LIVE_E2E=1 MEDBOT_API_URL=http://127.0.0.1:18000 npm run test:e2e -- --workers=1
```

Playwright starts the UI in explicit development-token mode at `http://localhost:3000`, using the
synthetic API's default token. The four live journeys cover manual recovery through routing/audit,
supplemental recovery, conflicting-source review, and failed-save preservation on desktop and mobile.
They skip unless `MEDBOT_LIVE_E2E=1`; the two existing mocked journeys remain available by default.
Set `MEDBOT_VISUAL_QA=1` to save synthetic recovery screenshots under `output/playwright/`.
The loopback-only backend is ephemeral and uses SQLite/in-memory adapters, so these checks do not
replace the Compose integration suite.

To run the same browser journeys against the full local platform, first run `make dev` and
`make integration` in the backend repository. Then, with no other UI server running, use:

```bash
MEDBOT_COMPOSE_E2E=1 MEDBOT_LIVE_E2E=1 MEDBOT_API_URL=http://localhost:8000 npm run test:e2e -- --workers=1
```

This mode starts the UI with OIDC authentication. Each live journey signs in through the real local
Keycloak login with the committed synthetic administrator, verifies the authenticated session, and
uses the BFF and backend. Both desktop and mobile projects run by default. It requires the usual
local OIDC configuration from `.env.example`; no AWS account or credentials are needed.

The OIDC-specific regression also checks immediate parallel session/list requests and referral
creation after login, without waits or retries. To stress this boundary on the full local stack:

```bash
MEDBOT_COMPOSE_E2E=1 MEDBOT_LIVE_E2E=1 MEDBOT_API_URL=http://localhost:8000 npm run test:e2e -- --workers=1 --grep 'fresh OIDC session' --repeat-each=20
```

## Real OCR and AI review

The backend supports local Ollama and server-side OpenAI/Gemini keys through Pydantic AI. Configure
deployment defaults in the backend repository, or use personal Settings. Saved keys are never returned
to the UI. The intake and review views show the
configured extractor/provider/model and identify hosted text transfer. For local inference, start
`make dev-real` in the backend, or configure its API to use an existing native local Ollama model.

Selecting evidence opens the original page as a scoped rendered image with its highlighted source
region. Previous/next page buttons and “Show selected evidence” support keyboard inspection. OCR method
and engine confidence are separate from model confidence. Original PDFs remain accessible; legacy
evidence without region metadata retains the embedded PDF viewer. Image failures offer a PDF link.

All real-model/OCR values await explicit approval or correction, even with high confidence. The backend
reports values awaiting review separately from absent required fields, so information requests describe
actual missing items. Routing and authorization remain enforced by the API.

With the full stack configured for real local extraction, run the complete desktop/mobile suite:

```bash
MEDBOT_COMPOSE_E2E=1 MEDBOT_LIVE_E2E=1 MEDBOT_REAL_EXTRACTION_E2E=1 \
MEDBOT_VISUAL_QA=1 MEDBOT_API_URL=http://localhost:8000 \
npm run test:e2e -- --workers=1
```

This runs 24 checks, including real scan intake, source regions, review-gated FHIR routing, multipage
navigation, unreadable-scan errors, recovery, and immediate OIDC requests. Real extraction tests require
Ollama and never call hosted providers. Synthetic PDFs are copied into this repository's own test
fixtures; no runtime source dependency crosses repositories. Screenshots contain synthetic data only.

## Personal provider settings

Open `/settings` from navigation to choose Ollama, OpenAI, or Gemini and a model name. Hosted keys pass
through the authenticated, origin-checked BFF and are encrypted by the backend. Only configured flags
come back. Empty replacement fields retain a key; explicit removal deletes the saved copy. Key fields
clear after save attempts and are never persisted in browser storage. Saving does not claim that a key
is valid with the provider. Ollama's endpoint stays administrator-owned.

Settings apply to the signed-in user and organization, including reprocessing they initiate. Other
users retain their choices. Deployment defaults can be restored without removing saved keys. All source,
review, completeness, and routing checks remain in force.

The real Compose suite includes hosted-key save/replacement/removal/reload and a personal Ollama
scan-to-reviewed-FHIR journey. It uses `synthetic-settings-alpha` / `local-only-settings-password`.
Existing realms need `make provision-settings-test-user` in the backend once; fresh imports include it.
Hosted keys are invalid synthetic strings; only local Ollama performs live inference.
