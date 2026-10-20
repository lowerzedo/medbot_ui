import { expect, test, type Page } from "@playwright/test";

const referralId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";
const fieldId = "33333333-3333-4333-8333-333333333333";
const timestamp = "2026-08-23T09:30:00Z";

interface MockState {
  approved: boolean;
  correctedValue: string | null;
  routed: boolean;
}

function referral(state: MockState) {
  const status = state.routed
    ? "ROUTED"
    : state.approved
      ? "READY_TO_ROUTE"
      : "NEEDS_REVIEW";
  return {
    id: referralId,
    status,
    requested_service: "Cardiology consultation",
    routing_queue: state.routed ? "cardiology_intake" : null,
    complete: true,
    created_at: timestamp,
    updated_at: timestamp,
    documents: [
      {
        id: documentId,
        original_filename: "synthetic-referral.pdf",
        media_type: "application/pdf",
        classification: "referral_order",
        processing_state: "EXTRACTED",
        page_count: 1,
        created_at: timestamp,
      },
    ],
    fields: [
      {
        id: fieldId,
        field_name: "requested_service",
        ai_value: "Cardiology consultation",
        reviewed_value: state.correctedValue,
        confidence: 0.93,
        evidence_status: "VERIFIED",
        review_status: state.approved
          ? "APPROVED"
          : state.correctedValue
            ? "CORRECTED"
            : "PENDING",
        reviewer_id: state.approved ? "reviewer-a" : null,
        reviewed_at: state.approved ? timestamp : null,
        review_reason: null,
        evidence: [
          {
            document_id: documentId,
            page: 1,
            block_id: "block-service",
            quote: "Please assess for cardiology consultation.",
            verified: true,
          },
        ],
      },
    ],
    validation: {
      complete: true,
      missing_fields: [],
      missing_documents: [],
      warnings: [],
    },
    validation_issues: [],
    routing_decision: state.routed
      ? {
          queue: "cardiology_intake",
          rule_version: "phase1-v1",
          created_at: timestamp,
        }
      : null,
  };
}

async function installMockApi(page: Page, state: MockState) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname === "/api/session" && method === "GET") {
      await route.fulfill({
        json: {
          user_id: "reviewer-a",
          organization_id: "org-a",
          roles: ["reviewer", "intake_specialist"],
          auth_method: "dev",
        },
      });
      return;
    }

    if (pathname === "/api/referrals" && method === "GET") {
      const detail = referral(state);
      await route.fulfill({
        json: {
          items: [
            {
              id: detail.id,
              status: detail.status,
              requested_service: detail.requested_service,
              routing_queue: detail.routing_queue,
              complete: detail.complete,
              created_at: detail.created_at,
              updated_at: detail.updated_at,
            },
          ],
          total: 1,
        },
      });
      return;
    }

    if (pathname === "/api/referrals" && method === "POST") {
      await route.fulfill({ json: referral(state), status: 201 });
      return;
    }

    if (pathname === `/api/referrals/${referralId}` && method === "GET") {
      await route.fulfill({ json: referral(state) });
      return;
    }

    if (
      pathname === `/api/referrals/${referralId}/documents` &&
      method === "POST"
    ) {
      await route.fulfill({
        json: { document: referral(state).documents[0], duplicate: false },
        status: 201,
      });
      return;
    }

    if (
      pathname === `/api/referrals/${referralId}/process` &&
      method === "POST"
    ) {
      await route.fulfill({ json: referral(state) });
      return;
    }

    if (pathname.endsWith(`/fields/${fieldId}/approve`) && method === "POST") {
      state.approved = true;
      await route.fulfill({ json: referral(state) });
      return;
    }

    if (pathname.endsWith(`/fields/${fieldId}/correct`) && method === "POST") {
      const submitted = request.postDataJSON() as { value: string };
      state.correctedValue = submitted.value;
      await route.fulfill({ json: referral(state) });
      return;
    }

    if (
      pathname === `/api/referrals/${referralId}/route` &&
      method === "POST"
    ) {
      state.routed = true;
      await route.fulfill({
        json: {
          referral_id: referralId,
          status: "ROUTED",
          queue: "cardiology_intake",
          rule_version: "phase1-v1",
          fhir_resource_count: 7,
        },
      });
      return;
    }

    if (pathname === `/api/referrals/${referralId}/fhir` && method === "GET") {
      await route.fulfill({
        json: {
          resourceType: "Bundle",
          type: "transaction",
          id: "bundle-1",
          entry: [
            {
              fullUrl: "urn:uuid:patient-1",
              resource: { resourceType: "Patient", id: "patient-1" },
              request: { method: "PUT", url: "Patient/patient-1" },
            },
          ],
        },
      });
      return;
    }

    if (pathname === `/api/referrals/${referralId}/audit` && method === "GET") {
      await route.fulfill({
        json: [
          {
            id: "audit-1",
            sequence: 1,
            timestamp,
            organization_id: "org-a",
            referral_id: referralId,
            actor_id: "reviewer-a",
            action: "REFERRAL_CREATED",
            resource_type: "referral",
            resource_id: referralId,
            trace_id: "trace-a",
            metadata: {},
            previous_event_hash: null,
            event_hash: "hash-a",
          },
        ],
      });
      return;
    }

    if (
      pathname.endsWith(`/documents/${documentId}/content`) &&
      method === "GET"
    ) {
      await route.fulfill({
        body: Buffer.from("%PDF-1.4\n% synthetic browser fixture\n%%EOF"),
        contentType: "application/pdf",
      });
      return;
    }

    await route.fulfill({
      json: {
        error: { message: `Unhandled mock route: ${method} ${pathname}` },
      },
      status: 500,
    });
  });
}

test("reviewer can inspect, approve, route, preview FHIR, and inspect audit", async ({
  page,
}) => {
  const state: MockState = {
    approved: false,
    correctedValue: null,
    routed: false,
  };
  await installMockApi(page, state);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Work queue" })).toBeVisible();
  await expect(page.getByText("Referral 11111111")).toBeVisible();

  await page.getByRole("link", { name: /Referral 11111111/ }).click();
  await expect(page).toHaveURL(`/referrals/${referralId}`);
  await expect(
    page.getByRole("heading", { name: "Source document" }),
  ).toBeVisible();
  await expect(
    page.getByText("Please assess for cardiology consultation."),
  ).toBeVisible();

  await page
    .getByRole("tab", { name: "Review", exact: true })
    .press("ArrowRight");
  await expect(
    page.getByRole("heading", { name: "FHIR R4 preview" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "FHIR preview" }).press("ArrowLeft");

  await page.getByRole("button", { name: "Correct value" }).click();
  await page
    .getByLabel("Corrected value")
    .fill("Cardiology specialist consultation");
  await page
    .getByLabel("Reason (optional)")
    .fill("Clarified from source wording");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(
    page.getByText("Cardiology specialist consultation"),
  ).toBeVisible();
  await expect(
    page.getByText("AI proposal: Cardiology consultation"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Approve value" }).click();
  await expect(page.getByRole("button", { name: "Approved" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Route referral" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Route referral" }).click();
  await expect(page.getByText("Routed", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "FHIR preview" }).click();
  await expect(page.getByText('"resourceType": "Bundle"')).toBeVisible();
  await page.getByRole("tab", { name: /Audit history/ }).click();
  await expect(
    page.getByText("referral created", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Hash-linked sequence")).toBeVisible();
});

test("intake user can upload a synthetic PDF and start processing", async ({
  page,
}) => {
  const state: MockState = {
    approved: false,
    correctedValue: null,
    routed: false,
  };
  await installMockApi(page, state);
  await page.goto("/");

  await page.locator("#referral-file").setInputFiles({
    name: "synthetic-referral.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% synthetic upload\n%%EOF"),
  });

  await expect(page).toHaveURL(`/referrals/${referralId}`);
  await expect(
    page.getByRole("heading", { name: "Structured referral" }),
  ).toBeVisible();
});
