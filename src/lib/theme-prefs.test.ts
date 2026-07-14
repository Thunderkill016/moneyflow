import assert from "node:assert/strict";
import test from "node:test";
import {
  applyThemeToDocument,
  defaultThemePreference,
  isThemePreference,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_STORAGE_KEY,
} from "./theme-prefs.ts";

function mockStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

test("default theme preference is system", () => {
  assert.equal(defaultThemePreference(), "system");
});

test("isThemePreference accepts known values only", () => {
  assert.equal(isThemePreference("light"), true);
  assert.equal(isThemePreference("dark"), true);
  assert.equal(isThemePreference("system"), true);
  assert.equal(isThemePreference("auto"), false);
  assert.equal(isThemePreference(null), false);
});

test("resolveTheme maps system to light/dark", () => {
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("readThemePreference falls back to system", () => {
  assert.equal(readThemePreference(null), "system");
  assert.equal(readThemePreference(mockStorage()), "system");
  assert.equal(
    readThemePreference(mockStorage({ [THEME_STORAGE_KEY]: "bogus" })),
    "system",
  );
  assert.equal(
    readThemePreference(mockStorage({ [THEME_STORAGE_KEY]: "dark" })),
    "dark",
  );
});

test("saveThemePreference persists and applyThemeToDocument sets data-theme", () => {
  const storage = mockStorage();
  assert.equal(saveThemePreference("dark", storage), "dark");
  assert.equal(storage.getItem(THEME_STORAGE_KEY), "dark");

  const el = { attributes: {} as Record<string, string>, setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  } };
  const doc = { documentElement: el } as unknown as Document;
  const resolved = applyThemeToDocument("dark", doc, () => ({
    matches: false,
  }) as MediaQueryList);
  assert.equal(resolved, "dark");
  assert.equal(el.attributes["data-theme"], "dark");

  const systemResolved = applyThemeToDocument("system", doc, () => ({
    matches: true,
  }) as MediaQueryList);
  assert.equal(systemResolved, "dark");
  assert.equal(el.attributes["data-theme"], "dark");
});
