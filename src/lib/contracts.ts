export type ReferralStatus =
  | "RECEIVED"
  | "QUARANTINED"
  | "PROCESSING"
  | "NEEDS_REVIEW"
  | "NEEDS_INFORMATION"
  | "READY_TO_ROUTE"
  | "ROUTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

export type EvidenceStatus =
  | "VERIFIED"
  | "REVIEW_REQUIRED"
  | "LOW_CONFIDENCE"
  | "UNSUPPORTED"
  | "CONFLICTING"
  | "HUMAN_CORRECTED";

export type FieldReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "CORRECTED"
  | "REJECTED";
export type DocumentProcessingStatus = "STORED" | "EXTRACTED" | "FAILED";
export type Role =
  | "intake_specialist"
  | "reviewer"
  | "supervisor"
  | "auditor"
  | "administrator"
  | "service";

export interface CurrentUser {
  user_id: string;
  organization_id: string;
  roles: Role[];
  auth_method: "dev" | "oidc";
}

export interface ReferralSummary {
  id: string;
  status: ReferralStatus;
  requested_service: string | null;
  routing_queue: string | null;
  complete: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralListResponse {
  items: ReferralSummary[];
  total: number;
}

export interface DocumentSummary {
  id: string;
  original_filename: string;
  media_type: string;
  classification: string;
  processing_state: DocumentProcessingStatus;
  page_count: number;
  created_at: string;
}

export interface EvidenceReference {
  document_id: string;
  page: number;
  block_id: string;
  quote: string;
  verified: boolean;
  extraction_method?: "fixture" | "pdf_text" | "ocr";
  ocr_confidence?: number | null;
  region?: { x: number; y: number; width: number; height: number } | null;
}

export interface ProcessingConfiguration {
  document_extractor: "fixture" | "pdfium-tesseract";
  ai_provider: "fixture" | "ollama" | "openai" | "gemini";
  ai_model: string | null;
  hosted: boolean;
}

export interface ExtractedField {
  id: string;
  field_name: string;
  ai_value: string | null;
  reviewed_value: string | null;
  confidence: number;
  evidence_status: EvidenceStatus;
  review_status: FieldReviewStatus;
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_reason: string | null;
  evidence: EvidenceReference[];
}

export type AIProviderName = "ollama" | "openai" | "gemini";
export interface PersonalAISettings {
  configuration: ProcessingConfiguration;
  using_defaults: boolean;
  revision: number;
  models: { ollama: string; openai: string; gemini: string };
  configured_keys: Array<"openai" | "gemini">;
  credential_storage_available: boolean;
}

export interface FieldSupplyRequest {
  field_path: string;
  value: string;
  reason: string;
}

export interface ValidationIssue {
  id: string;
  code: string;
  severity: "ERROR" | "WARNING";
  message: string;
  field_path: string | null;
  resolved: boolean;
}

export interface ReferralValidation {
  complete: boolean | null;
  missing_fields: string[];
  pending_review_fields?: string[];
  missing_documents: string[];
  warnings: string[];
}

export interface RoutingDecision {
  queue: string;
  rule_version: string;
  created_at: string;
}

export interface ReferralDetail extends ReferralSummary {
  documents: DocumentSummary[];
  fields: ExtractedField[];
  validation: ReferralValidation;
  validation_issues: ValidationIssue[];
  routing_decision: RoutingDecision | null;
}

export interface AuditEvent {
  id: string;
  sequence: number;
  timestamp: string;
  organization_id: string;
  referral_id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  trace_id: string;
  metadata: Record<string, string>;
  previous_event_hash: string | null;
  event_hash: string;
}

interface FhirIdentifier {
  system: string;
  value: string;
}

interface FhirReference {
  reference: string;
}

interface FhirHumanName {
  text: string;
}

interface FhirResourceBase<T extends string> {
  id: string;
  resourceType: T;
}

interface FhirPatient extends FhirResourceBase<"Patient"> {
  identifier?: FhirIdentifier[];
  name?: FhirHumanName[];
  birthDate?: string;
}

interface FhirPractitioner extends FhirResourceBase<"Practitioner"> {
  identifier: FhirIdentifier[];
  active: true;
  name?: FhirHumanName[];
}

interface FhirOrganization extends FhirResourceBase<"Organization"> {
  identifier: FhirIdentifier[];
  active: true;
}

interface FhirServiceRequest extends FhirResourceBase<"ServiceRequest"> {
  identifier: FhirIdentifier[];
  status: "active";
  intent: "order";
  subject: FhirReference;
  requester?: FhirReference;
  authoredOn: string;
  description?: string;
}

interface FhirDocumentReference extends FhirResourceBase<"DocumentReference"> {
  identifier: FhirIdentifier[];
  status: "current";
  subject: FhirReference;
  date: string;
  content: Array<{
    attachment: {
      contentType: "application/pdf";
      url: string;
      title: string;
      size: number;
      hash?: string;
    };
  }>;
}

interface FhirTask extends FhirResourceBase<"Task"> {
  identifier: FhirIdentifier[];
  status: "requested";
  intent: "order";
  focus: FhirReference;
  for: FhirReference;
  owner: FhirReference;
}

interface FhirProvenance extends FhirResourceBase<"Provenance"> {
  target: FhirReference[];
  recorded: string;
  agent: Array<{ who: FhirReference }>;
}

export type FhirResource =
  | FhirPatient
  | FhirPractitioner
  | FhirOrganization
  | FhirServiceRequest
  | FhirDocumentReference
  | FhirTask
  | FhirProvenance;

export interface FhirBundleEntry {
  fullUrl: string;
  resource: FhirResource;
  request: { method: "PUT"; url: string };
}

export interface FhirBundle {
  resourceType: "Bundle";
  type: "transaction";
  id: string;
  entry: FhirBundleEntry[];
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    trace_id: string;
    fields: string[];
  };
}
