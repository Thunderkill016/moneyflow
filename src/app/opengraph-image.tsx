import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MoneyFlow v3.0 — La bàn Dòng tiền Thông minh";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        background: "linear-gradient(135deg, #070B14 0%, #0F172A 100%)",
      }}
    >
      <svg width="160" height="160" viewBox="0 0 512 512" fill="none">
        <rect
          x="16"
          y="16"
          width="480"
          height="480"
          rx="112"
          fill="#0B132B"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="4"
        />
        <path
          d="M116 346V194C116 156 162 150 180 184L226 272C240 298 274 298 288 272L322 206C336 178 370 174 392 194L400 202"
          stroke="#10B981"
          strokeWidth="40"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M366 150L404 146L400 184"
          stroke="#6366F1"
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="404" cy="146" r="16" fill="#34D399" />
      </svg>
      <div
        style={{
          display: "flex",
          fontSize: 64,
          fontWeight: 700,
          color: "#F8FAFC",
          letterSpacing: "-0.02em",
        }}
      >
        MoneyFlow v3.0
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          color: "#94A3B8",
        }}
      >
        La bàn Dòng tiền Thông minh · Local-First
      </div>
    </div>,
    { ...size },
  );
}
