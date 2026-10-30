import { describe, test, expect } from "bun:test";
import { THEMES, getRandomTheme, getWinnerTheme, CLARA_THEME } from "../js/themes.js";

describe("THEMES", () => {
  test("has exactly 50 entries", () => {
    expect(THEMES.length).toBe(50);
  });

  test("every entry has a unique id", () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every entry has a non-empty label, emoji, and image filename", () => {
    for (const theme of THEMES) {
      expect(typeof theme.label).toBe("string");
      expect(theme.label.length).toBeGreaterThan(0);
      expect(typeof theme.emoji).toBe("string");
      expect(theme.emoji.length).toBeGreaterThan(0);
      expect(theme.image).toMatch(/^themes\/[a-z0-9-]+\.jpg$/);
    }
  });
});

describe("getRandomTheme", () => {
  test("returns a theme object from the THEMES list", () => {
    const theme = getRandomTheme();
    expect(THEMES).toContain(theme);
  });

  test("over many calls, returns more than one distinct theme (actually random)", () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      seen.add(getRandomTheme().id);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("getWinnerTheme", () => {
  test("returns the Loustic horse theme for Clara, case-insensitively", () => {
    for (const name of ["clara", "Clara", "CLARA", "  cLaRa  "]) {
      expect(getWinnerTheme(name)).toBe(CLARA_THEME);
    }
    expect(CLARA_THEME.image).toBe("themes/horse_loustic.jpg");
  });

  test("returns null for any other name", () => {
    for (const name of ["Clarisse", "Clara B", "Anna", ""]) {
      expect(getWinnerTheme(name)).toBeNull();
    }
  });

  test("the Clara theme is never part of the random rotation", () => {
    expect(THEMES).not.toContain(CLARA_THEME);
  });
});
