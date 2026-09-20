import { requireViewer } from "../auth.ts";
import { todayInVietnam } from "../../lib/vietnam-date.ts";

import type { CapabilityContext } from "./types.ts";

export function buildCapabilityContext(
  viewerId: string,
  now: Date = new Date(),
): CapabilityContext {
  return {
    viewerId,
    today: todayInVietnam(now),
    now: now.toISOString(),
  };
}

export async function createCapabilityContext(
  now: Date = new Date(),
): Promise<CapabilityContext> {
  const viewer = await requireViewer();
  return buildCapabilityContext(viewer.id, now);
}
