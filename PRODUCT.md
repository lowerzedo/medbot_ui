# Product

## Register

product

## Users

MedBot serves healthcare referral intake specialists, reviewers, supervisors, auditors, and administrators. They work in a high-attention operational setting, often processing a queue for long periods and needing to understand what the system extracted, why it extracted it, what is missing, and what action is safe to take next.

## Product Purpose

MedBot turns synthetic, unstructured referral documents into evidence-linked administrative workflows. The reviewer experience must make source evidence, extraction confidence, completeness results, human corrections, FHIR output, routing decisions, and audit history easy to inspect without treating AI output as authoritative. Success means a reviewer can complete a referral workflow efficiently while the backend preserves tenant isolation, deterministic policy decisions, and a verifiable record of every change.

## Brand Personality

Calm, exact, trustworthy. The voice is concise and operational, with the gravity appropriate to healthcare data but without alarmism or clinical claims. The interface should reduce uncertainty by exposing provenance and state clearly.

## Anti-references

- A generic chatbot or conversational AI interface.
- A decorative SaaS dashboard built around vanity metrics, gradients, glass effects, or oversized cards.
- A clinical decision-support product that implies diagnosis, urgency scoring, treatment advice, eligibility, or medical necessity.
- A dense enterprise admin portal with inconsistent controls, hidden state, or ambiguous actions.
- Motion or decoration that competes with document review.

## Design Principles

1. Show the source of every important claim. Evidence is part of the value, not secondary metadata.
2. Keep the next safe action obvious. Workflow controls must reflect deterministic backend rules and never imply that the UI is the policy authority.
3. Make uncertainty legible. Missing, conflicting, unsupported, AI-proposed, and human-corrected values must remain distinguishable without relying on color alone.
4. Optimize for sustained review work. Favor compact hierarchy, predictable navigation, clear focus states, and useful loading, empty, and error states.
5. Preserve human accountability. Corrections, approvals, routing decisions, and audit events must state who acted and what changed.

## Accessibility & Inclusion

Use semantic HTML and accessible controls, target WCAG 2.2 AA for the operational UI, maintain complete keyboard paths for core review actions, provide visible focus indicators, support reduced motion, and never communicate status by color alone. Body copy and form placeholders must meet readable contrast targets, and source-evidence interactions must work without precise pointer input.
