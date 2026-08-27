/*
 * Where a user writes when something goes wrong.
 *
 * This existed as a literal in two unrelated components, and the literal was
 * `support@moneyflow.app` — an address on a domain this project does not own.
 * `moneyflow.app` serves a different Money Flow product operated by another
 * company, so every privacy request and every error report a user sent from
 * inside the app went to a stranger's mailbox and the owner never knew anyone
 * had asked for help. That is what RRB-05 was blocking on.
 *
 * The address now lives in one place so the two copies cannot drift again, and
 * `support-contact.test.ts` fails the build if any address on a domain we do not
 * control reappears anywhere under `src/`.
 *
 * Owner decision, 2026-08-27: use the owner's own mailbox. It is reachable today,
 * which a domain we do not control never was.
 */

/** The operator's mailbox, chosen by the owner on 2026-08-27. */
export const SUPPORT_EMAIL = "dinhbahoang1605@gmail.com";

/**
 * Hosts this project actually controls. `moneyflow.app` is deliberately absent:
 * it belongs to someone else, and treating it as ours is the original defect.
 */
export const OWNED_HOSTS = ["mfvn.vercel.app"] as const;

/** The production origin, canonical per the Vercel project's domain list. */
export const PRODUCTION_ORIGIN = "https://mfvn.vercel.app";

/**
 * A prefilled support message. The body deliberately warns against pasting raw
 * statements: a support mailbox is not a place for anyone's financial records.
 */
export function supportMailtoHref(subject: string, body: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}
