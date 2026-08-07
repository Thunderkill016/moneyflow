import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCOUNT_DELETION_PATH,
  ACCOUNT_DELETION_REAUTH_USER_COOKIE,
  accountDeletionReauthUrl,
} from "@/lib/account-deletion-reauth";
import { safeNextPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

async function clearExpectedReauthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ACCOUNT_DELETION_REAUTH_USER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: 0,
    expires: new Date(0),
  });
}

function reauthErrorUrl(origin: string, code: string) {
  const destination = new URL(accountDeletionReauthUrl(), origin);
  destination.searchParams.set("error", code);
  return destination;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const cookieStore = await cookies();
  const expectedUserId =
    next === ACCOUNT_DELETION_PATH
      ? cookieStore.get(ACCOUNT_DELETION_REAUTH_USER_COOKIE)?.value
      : undefined;
  const supabase = await createClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (expectedUserId) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        await clearExpectedReauthCookie();

        if (userError || !user || user.id !== expectedUserId) {
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {
            // The mismatch itself is authoritative; cookie cleanup above remains.
          }
          return NextResponse.redirect(
            reauthErrorUrl(url.origin, "reauth-account-mismatch"),
          );
        }
      }

      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  if (expectedUserId) {
    await clearExpectedReauthCookie();
    return NextResponse.redirect(reauthErrorUrl(url.origin, "callback"));
  }

  return NextResponse.redirect(new URL("/login?error=callback", url.origin));
}
