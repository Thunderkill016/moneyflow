import type { Metadata } from "next";
import { GuidedStoryPrototype } from "@/components/design-preview/public-entry-prototypes";

export const metadata: Metadata = {
  title: "Guided-story prototype · MoneyFlow",
  robots: { index: false, follow: false },
};

export default function GuidedStoryPreviewPage() {
  return <GuidedStoryPrototype />;
}
