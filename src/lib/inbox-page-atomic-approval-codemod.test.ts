import test from "node:test";
import { emitAtomicInboxPagePatch } from "../../scripts/emit-inbox-page-atomic-patch.ts";

test("emit reviewed atomic Inbox page patch", () => {
  emitAtomicInboxPagePatch();
});
