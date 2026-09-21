import { z } from "zod";

/**
 * Integer amount in an account's minor unit. For VND that is đồng: stored
 * and computed as an exact safe integer, never a float and never a
 * mixed-currency sum. The brand keeps money values type-distinct from raw
 * numbers so contracts (capabilities, future transports) cannot silently
 * widen or reinterpret them.
 */
export const minorSchema = z
  .number()
  .int()
  .brand<"Minor">();

export type Minor = z.infer<typeof minorSchema>;

/** Validates a value as a safe-integer minor amount; throws on violation. */
export function minor(value: number): Minor {
  return minorSchema.parse(value);
}

/** Returns the minor amount or null when the value cannot satisfy it. */
export function minorOrNull(value: unknown): Minor | null {
  const parsed = minorSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
