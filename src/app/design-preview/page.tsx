import type { Metadata } from "next";
import { DesignPreviewIndex } from "@/components/design-preview/public-entry-prototypes";

export const metadata: Metadata = {
  title: "MoneyFlow design preview",
  description: "Review-only coded prototypes for the MoneyFlow public experience.",
  robots: { index: false, follow: false },
};

export default function DesignPreviewPage() {
  return <DesignPreviewIndex />;
}
