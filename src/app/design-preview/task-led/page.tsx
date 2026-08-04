import type { Metadata } from "next";
import { TaskLedPrototype } from "@/components/design-preview/public-entry-prototypes";

export const metadata: Metadata = {
  title: "Task-led prototype · MoneyFlow",
  robots: { index: false, follow: false },
};

export default function TaskLedPreviewPage() {
  return <TaskLedPrototype />;
}
