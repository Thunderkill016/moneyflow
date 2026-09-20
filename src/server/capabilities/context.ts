import { requireViewer } from "../auth.ts";
import { todayInVietnam } from "../../lib/vietnam-date.ts";

import type { CapabilityContext } from "./types.ts";

export async function createCapabilityContext(
  now: Date = new Date(),
): Promise<CapabilityContext> {
  const viewer = await requireViewer();
  return {
    viewerId: viewer.id,
    today: todayInVietnam(now),
    now: now.toISOString(),
  };
}
