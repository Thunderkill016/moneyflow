import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MoneyFlow — Sổ thu chi cá nhân";

/** Reuses the exact canonical mark path from src/app/icon.svg for brand consistency. */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          background: "#0B6B3A",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 140,
            height: 140,
            borderRadius: 32,
            background: "rgba(255,255,255,0.14)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="88" height="88" viewBox="0 0 64 64">
            <path
              d="M17 43V23.5C17 21.57 18.57 20 20.5 20H22.6L32 34.2L41.4 20H43.5C45.43 20 47 21.57 47 23.5V43"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={5.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#FFFFFF" }}>
          MoneyFlow
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "rgba(255,255,255,0.85)" }}>
          Rõ từng dòng tiền
        </div>
      </div>
    ),
    { ...size },
  );
}
