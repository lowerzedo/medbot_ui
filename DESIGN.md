---
name: MedBot Referral Operations
description: Evidence-first referral review for careful administrative work.
colors:
  packet-white: "oklch(1 0 0)"
  working-surface: "oklch(0.976 0.004 353.3)"
  inset-surface: "oklch(0.948 0.008 353.3)"
  graphite-ink: "oklch(0.19 0.016 353.3)"
  muted-ink: "oklch(0.405 0.018 353.3)"
  divider: "oklch(0.875 0.009 353.3)"
  review-stamp: "oklch(0.485 0.158 353.3)"
  review-stamp-hover: "oklch(0.425 0.151 353.3)"
  rose-wash: "oklch(0.955 0.027 353.3)"
  evidence-blue: "oklch(0.39 0.09 215)"
  evidence-wash: "oklch(0.95 0.026 215)"
  verified-green: "oklch(0.42 0.105 150)"
  attention-amber: "oklch(0.54 0.13 72)"
  exception-red: "oklch(0.48 0.17 28)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 720
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.3
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.review-stamp}"
    textColor: "{colors.packet-white}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.review-stamp-hover}"
    textColor: "{colors.packet-white}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  button-secondary:
    backgroundColor: "{colors.packet-white}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  input:
    backgroundColor: "{colors.packet-white}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  navigation-active:
    backgroundColor: "{colors.rose-wash}"
    textColor: "{colors.review-stamp}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

# Design System: MedBot Referral Operations

## 1. Overview

**Creative North Star: "The Verified Referral Packet"**

MedBot should feel like a well-organized records workroom in bright daylight: crisp referral pages, precise annotations, and a single review stamp that means an accountable person has acted. The interface is quiet enough for long review sessions, but it makes evidence, uncertainty, and required actions unmistakable.

This is a product surface, not a marketing canvas. Familiar controls, compact information hierarchy, and stable side-by-side review matter more than visual novelty. The system rejects chatbot styling, decorative SaaS dashboards, and any visual language that implies clinical decision-making.

**Key Characteristics:**

- Evidence is always one interaction away from the proposed value.
- White and near-white surfaces keep dense records readable in bright office environments.
- Deep rose marks identity and primary action on less than ten percent of a screen.
- Status is expressed with text, shape, and iconography in addition to color.
- Motion is limited to fast state feedback, never page choreography.

## 2. Colors

The palette resembles black ink, blue evidence annotation, and a restrained deep-rose review stamp on a white referral packet.

### Primary

- **Review Stamp:** The only brand-saturated color. Use it for the active navigation state, primary workflow action, selected tab rule, and product mark.
- **Rose Wash:** A quiet selection layer behind active controls. Never use it as a page background.

### Secondary

- **Evidence Blue:** Identifies source-evidence controls, selected evidence, and informational focus states.
- **Evidence Wash:** Supports evidence annotations without competing with document content.

### Tertiary

- **Verified Green:** Reserved for completed deterministic checks and verified evidence.
- **Attention Amber:** Reserved for missing information and review-required states.
- **Exception Red:** Reserved for failed, unsupported, quarantined, or destructive states.

### Neutral

- **Packet White:** The page and document-adjacent background.
- **Working Surface:** Navigation, table headers, and quiet work-area separation.
- **Inset Surface:** Skeletons, inactive badges, and nested control backgrounds.
- **Graphite Ink:** Primary text with strong contrast for sustained reading.
- **Muted Ink:** Secondary labels and metadata, never essential instructions by itself.
- **Divider:** One-pixel structural separation for tables, panels, and navigation.

### Named Rules

**The Ten Percent Stamp Rule.** Review Stamp is used on no more than ten percent of a screen. Its rarity gives primary actions meaning.

**The Semantic Separation Rule.** Review Stamp is brand identity. Evidence Blue, Verified Green, Attention Amber, and Exception Red keep operational state distinct from brand.

## 3. Typography

**Display Font:** Inter (with ui-sans-serif and system-ui fallbacks)
**Body Font:** Inter (with ui-sans-serif and system-ui fallbacks)
**Label/Mono Font:** SFMono-Regular (with Consolas and Liberation Mono fallbacks) for opaque identifiers only

**Character:** One restrained sans family keeps the product familiar and readable. Weight and spacing establish hierarchy; display typography never enters control labels or dense data.

### Hierarchy

- **Display** (720, 2rem, 1.12): Work-queue title only, with a fixed product scale rather than fluid hero sizing.
- **Headline** (720, 1.5rem, 1.2): Referral workspace title and top-level detail views.
- **Title** (700, 1.125rem, 1.25): Queue and panel sections.
- **Body** (400, 0.875rem, 1.55): Instructions, summaries, and evidence quotes. Prose remains within 65 to 75 characters where layout permits.
- **Label** (650, 0.75rem, 1.3): Metadata, field paths, table headers, and state labels. Sentence case is required.

### Named Rules

**The Opaque Identifier Rule.** Monospace is reserved for referral IDs, block IDs, and trace IDs. Patient-facing or reviewer-facing values stay in the sans family.

## 4. Elevation

MedBot is flat by default. Depth comes from tonal surface changes and one-pixel dividers. Shadows are avoided on standing panels and tables; inset outlines communicate selected evidence. A small shadow is permitted only for a temporary floating layer such as a menu or focus overlay.

### Shadow Vocabulary

- **Selection inset** (`box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--accent) 55%, white)`): Shows the evidence reference currently driving the source view.

### Named Rules

**The Flat Workbench Rule.** Persistent surfaces never float. If a standing panel needs a wide drop shadow to read, its structure is wrong.

## 5. Components

### Buttons

- **Shape:** Compact, gently curved controls (8px radius) with a minimum 40px target height.
- **Primary:** Review Stamp fill, white label, and 10px by 14px padding. Labels use verb plus object, such as “Route referral”.
- **Hover / Focus:** A darker Review Stamp hover and a three-pixel Evidence Blue focus outline. Active state moves down one pixel and reduced-motion mode removes the transition.
- **Secondary / Ghost:** Secondary buttons use a structural border without a decorative shadow. Quiet buttons use no standing border and gain a tonal background on hover.

### Chips

- **Style:** Full-pill state badges use a pale semantic fill, dark semantic text, and a leading dot.
- **State:** Every chip includes a readable text label. Color is never the sole status signal.

### Cards / Containers

- **Corner Style:** Large containers stop at a 12px radius.
- **Background:** Packet White on Working Surface, or flat Packet White separated by Divider.
- **Shadow Strategy:** No standing shadow.
- **Border:** One-pixel Divider only when the boundary carries structure.
- **Internal Padding:** 16px to 24px based on density.

### Inputs / Fields

- **Style:** Packet White fill, one-pixel strong divider, 8px radius, and a minimum 40px height.
- **Focus:** Evidence Blue stroke plus a translucent three-pixel focus halo.
- **Error / Disabled:** Error messages use Exception Red plus text. Disabled controls retain legibility and expose native disabled semantics.

### Navigation

The desktop shell uses a 240px left navigation and 64px header. Active navigation receives Rose Wash and stronger text; mobile navigation becomes a fixed three-item bottom bar. Labels and icon shapes remain consistent at both sizes.

### Evidence Reference

Evidence controls use Evidence Wash, a document icon, and a page label. Selecting one updates the PDF page and presents the exact verified quote and block identifier directly beneath the document.

## 6. Do's and Don'ts

### Do:

- **Do** keep the source document and structured referral visible together on review-sized screens.
- **Do** use 150ms to 220ms state transitions and provide a reduced-motion alternative.
- **Do** expose loading skeletons, actionable empty states, safe error messages, and visible keyboard focus.
- **Do** distinguish AI proposals, human-corrected values, verification state, and reviewer approval in text.
- **Do** keep status controls familiar and require the backend to authorize every action.

### Don't:

- **Don't** build a generic chatbot or conversational AI interface.
- **Don't** build a decorative SaaS dashboard around vanity metrics, gradients, glass effects, or oversized cards.
- **Don't** imply diagnosis, urgency scoring, treatment advice, eligibility, or medical necessity.
- **Don't** create a dense enterprise admin portal with inconsistent controls, hidden state, or ambiguous actions.
- **Don't** add motion or decoration that competes with document review.
- **Don't** use colored side-stripe borders, gradient text, nested cards, or card radii above 16px.
- **Don't** place patient data, document text, or FHIR payloads in URLs, telemetry, logs, or error messages.

## Recovery interactions

Missing-information recovery sits inline between the document checklist and field review. Native
`details` controls reveal individual missing-field forms and supplemental upload controls without
interrupting source review. A supplied value requires a confirmation reason and is marked as reviewer
supplied. Conflicting values expose every source quote together and require an explained correction.
Forms retain input on failure, controls expose pending/disabled states, and status text announces
successful requests/uploads. Recovery uses the existing neutral surfaces, type, spacing, focus,
and semantic colors; no additional motion or dependencies are introduced.

# Source page review

Personal AI settings use a single form in the existing shell, with visible current configuration,
plain provider/model inputs, explicit saved-key state, password-only replacement, and inline save/error
feedback. Saved credentials are never echoed. The hosted transfer explanation appears beside provider
selection. The same Settings item is available in desktop navigation and the mobile bottom bar.

Evidence selection opens the matching page with a normalized source-region overlay. Use the existing
accent and warning tokens; preserve full-page context and a direct original-PDF link. Show OCR method
and confidence alongside the quote, separate from model confidence. Keep page navigation explicit and
keyboard accessible. Distinguish proposed values awaiting review from genuinely missing information.
Provider context belongs before intake and in review, with clear hosted text-transfer copy and no keys.
