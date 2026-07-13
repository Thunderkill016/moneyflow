import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Quên mật khẩu — MoneyFlow" };
export default function Page() { return <AuthForm mode="forgot" />; }
