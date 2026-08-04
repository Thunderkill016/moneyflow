import type { Metadata } from "next";
import { ProofFirstPrototype } from "@/components/design-preview/public-entry-prototypes";

export const metadata: Metadata = {
  title: "Proof-first prototype · MoneyFlow",
  robots: { index: false, follow: false },
};

export default function ProofFirstPreviewPage() {
  return <ProofFirstPrototype />;
}
