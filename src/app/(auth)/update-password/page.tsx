import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Đặt mật khẩu mới — MoneyFlow" };
export default function Page() { return <AuthForm mode="update" />; }
