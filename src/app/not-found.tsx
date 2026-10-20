import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        display: "grid",
        minHeight: "100vh",
        placeContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "32rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.75rem" }}>
          Referral not found
        </h1>
        <p
          className="muted"
          style={{ lineHeight: 1.55, margin: "0 0 1.25rem" }}
        >
          It may not exist, or your organization may not have access to it.
        </p>
        <Link className="button button-secondary" href="/">
          Return to work queue
        </Link>
      </div>
    </main>
  );
}
