"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { sanitizeSpeedInsightsUrl } from "@/lib/speed-insights";

export function PrivacySafeSpeedInsights() {
  return (
    <SpeedInsights
      sampleRate={1}
      beforeSend={(data) => {
        const url = sanitizeSpeedInsightsUrl(data.url);
        if (!url) return null;
        return { ...data, url };
      }}
    />
  );
}
