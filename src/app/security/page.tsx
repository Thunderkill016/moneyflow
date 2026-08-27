import type { Metadata } from "next";
import { SecurityPage } from "@/components/security-page";

export const metadata: Metadata = {
  title: "Bảo mật — MoneyFlow",
  description:
    "MoneyFlow được bảo vệ thế nào: điều sản phẩm tự làm, điều nền tảng cung cấp, và điều chưa có.",
  alternates: { canonical: "/security" },
};

export default function Page() {
  return <SecurityPage />;
}
