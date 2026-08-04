import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MoneyFlow — Sổ thu chi cá nhân";

/** Reuses the exact canonical B3.2 geometry from src/app/icon.svg. */
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
          background: "#3445FB",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 150,
            height: 150,
            borderRadius: 36,
            background: "rgba(255,255,255,0.14)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="112" height="112" viewBox="0 0 160 160">
            <g
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="16.18"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22.80 64.20C22.80 40.40 42.10 28.00 66.40 28.00H128.20" />
              <path d="M137.20 95.80C137.20 119.60 117.90 132.00 93.60 132.00H31.80" />
            </g>
            <path
              d="M80 54.11A16 16 0 0 1 96 70.11V89.89A16 16 0 0 1 80 105.89A16 16 0 0 1 64 89.89V70.11A16 16 0 0 1 80 54.11ZM80 67.06A4.94 4.94 0 0 0 75.06 72V88.01A4.94 4.94 0 0 0 80 92.95A4.94 4.94 0 0 0 84.94 88.01V72A4.94 4.94 0 0 0 80 67.06Z"
              fill="#FFFFFF"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#FFFFFF" }}>
          MoneyFlow
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "rgba(255,255,255,0.88)" }}>
          Rõ từng dòng tiền
        </div>
      </div>
    ),
    { ...size },
  );
}
