/** Fail before fixture administration unless this is the configured disposable stack. */
export function localStatementEnvironment(env = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (url !== "http://127.0.0.1:54321") {
    throw new Error(
      "Statement acceptance requires the disposable loopback Supabase URL",
    );
  }
  const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = env.MF_STATEMENT_SERVICE_ROLE_KEY;
  if (!anonKey || !serviceRoleKey) {
    throw new Error(
      "Statement acceptance requires disposable anon and fixture-admin keys",
    );
  }
  return { url, anonKey, serviceRoleKey };
}
