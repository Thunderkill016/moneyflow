import { requireViewer } from "../auth.ts";

import { buildCapabilityContext } from "./types.ts";
import type { CapabilityContext } from "./types.ts";

export async function createCapabilityContext(
  now: Date = new Date(),
): Promise<CapabilityContext> {
  const viewer = await requireViewer();
  return buildCapabilityContext(viewer.id, { now, clientId: viewer.clientId });
}
