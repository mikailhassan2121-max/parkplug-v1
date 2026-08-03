"use client";

/**
 * Last-resort boundary. This replaces the root layout, so it cannot rely on
 * any of the app's providers or shared styling.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem 1.5rem",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          color: "#313746",
          backgroundColor: "#ffffff",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <div
            aria-hidden="true"
            style={{
              width: "3.5rem",
              height: "3.5rem",
              margin: "0 auto",
              borderRadius: "1rem",
              backgroundColor: "#184878",
              color: "#ffffff",
              display: "grid",
              placeItems: "center",
              fontSize: "1.5rem",
              fontWeight: 800,
            }}
          >
            P
          </div>

          <h1
            style={{
              marginTop: "1.5rem",
              fontSize: "1.75rem",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "#20242e",
            }}
          >
            ParkPlugs could not load
          </h1>
          <p style={{ marginTop: "0.75rem", lineHeight: 1.6, color: "#4e5a76" }}>
            Something went wrong before the page could start. Reloading usually
            fixes it. Nothing you were working on has been submitted.
          </p>

          <div
            style={{
              marginTop: "1.75rem",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: "2.75rem",
                padding: "0 1.5rem",
                borderRadius: "0.75rem",
                border: "none",
                backgroundColor: "#184878",
                color: "#ffffff",
                fontSize: "0.9375rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/*
              A hard navigation is deliberate: this boundary replaces the root
              layout, so the router may be the thing that failed.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                minHeight: "2.75rem",
                padding: "0 1.5rem",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "0.75rem",
                border: "1px solid #aeb7c9",
                color: "#313746",
                fontSize: "0.9375rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Return home
            </a>
          </div>

          {error.digest ? (
            <p style={{ marginTop: "2rem", fontSize: "0.6875rem", color: "#63728f" }}>
              Error reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
