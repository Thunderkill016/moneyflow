import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding-flow";

export const metadata: Metadata = {
  title: "Bắt đầu — MoneyFlow",
  description: "Cam kết quyền riêng tư và chọn cách đưa dữ liệu đầu tiên vào Hộp thư giao dịch.",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
