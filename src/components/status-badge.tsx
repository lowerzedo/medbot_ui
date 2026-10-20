import type { ReferralStatus } from "@/lib/contracts";

import styles from "./status-badge.module.css";

const labels: Record<ReferralStatus, string> = {
  RECEIVED: "Received",
  QUARANTINED: "Quarantined",
  PROCESSING: "Processing",
  NEEDS_REVIEW: "Needs review",
  NEEDS_INFORMATION: "Needs information",
  READY_TO_ROUTE: "Ready to route",
  ROUTED: "Routed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function StatusBadge({ status }: { status: ReferralStatus }) {
  return (
    <span className={styles.badge} data-status={status}>
      <span aria-hidden="true" className={styles.dot} />
      {labels[status]}
    </span>
  );
}
