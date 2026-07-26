import { expect, type Page, type TestInfo } from "@playwright/test";

type FocusState = {
  element: string;
  top: number;
  right: number;
  bottom: number;
  left: number;
  outline: string;
  outlineWidth: string;
  boxShadow: string;
  viewportWidth: number;
  viewportHeight: number;
};

async function readFocusState(page: Page): Promise<FocusState | null> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active === document.body) return null;
    const rect = active.getBoundingClientRect();
    const style = window.getComputedStyle(active);
    return {
      element: `${active.tagName.toLowerCase()}${active.id ? `#${active.id}` : ""}`,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      outline: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
    };
  });
}

function isInsideViewport(state: FocusState): boolean {
  return !(
    state.right < -1 ||
    state.left > state.viewportWidth + 1 ||
    state.bottom < -1 ||
    state.top > state.viewportHeight + 1
  );
}

export async function assertKeyboardFocusVisible(page: Page, testInfo: TestInfo): Promise<void> {
  const findings: string[] = [];

  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");

    // The product enables smooth document scrolling. Native focus scrolling can
    // therefore take several animation frames. Wait for the browser to finish
    // bringing the focused control into view, but never scroll it ourselves.
    await page
      .waitForFunction(
        () => {
          const active = document.activeElement;
          if (!(active instanceof HTMLElement) || active === document.body) return true;
          const rect = active.getBoundingClientRect();
          const width = document.documentElement.clientWidth;
          const height = document.documentElement.clientHeight;
          return !(
            rect.right < -1 ||
            rect.left > width + 1 ||
            rect.bottom < -1 ||
            rect.top > height + 1
          );
        },
        undefined,
        { timeout: 2_000, polling: "raf" },
      )
      .catch(() => undefined);

    const focusState = await readFocusState(page);
    if (!focusState) continue;

    if (!isInsideViewport(focusState)) {
      findings.push(`${focusState.element} is outside the viewport after Tab ${index + 1}`);
    }

    const hasOutline =
      focusState.outline !== "none" &&
      focusState.outlineWidth !== "0px" &&
      focusState.outlineWidth !== "0";
    const hasBoxShadow =
      focusState.boxShadow !== "none" &&
      focusState.boxShadow !== "rgba(0, 0, 0, 0) 0px 0px 0px 0px";
    if (!hasOutline && !hasBoxShadow) {
      findings.push(`${focusState.element} has no visible focus indicator`);
    }
  }

  await testInfo.attach(`keyboard-${testInfo.project.name}.json`, {
    body: Buffer.from(JSON.stringify({ findings }, null, 2)),
    contentType: "application/json",
  });

  expect(findings, findings.join("\n")).toEqual([]);
}
