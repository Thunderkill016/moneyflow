import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Tạo tài khoản — MoneyFlow" };
export default function Page() { return <AuthForm mode="register" />; }
