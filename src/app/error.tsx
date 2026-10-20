"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
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
          The workspace hit a problem
        </h1>
        <p
          className="muted"
          style={{ lineHeight: 1.55, margin: "0 0 1.25rem" }}
        >
          No referral data was changed. Retry the screen, or return to the work
          queue.
        </p>
        <button className="button button-primary" onClick={reset} type="button">
          Retry workspace
        </button>
      </div>
    </main>
  );
}
