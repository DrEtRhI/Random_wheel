import { describe, test, expect } from "bun:test";
import { getCurrentSeason } from "../js/season.js";

describe("getCurrentSeason", () => {
  const cases = [
    [0, "winter"], // January
    [1, "winter"], // February
    [2, "spring"], // March
    [3, "spring"], // April
    [4, "spring"], // May
    [5, "summer"], // June
    [6, "summer"], // July
    [7, "summer"], // August
    [8, "autumn"], // September
    [9, "autumn"], // October
    [10, "autumn"], // November
    [11, "winter"], // December
  ];

  for (const [month, expected] of cases) {
    test(`month index ${month} maps to ${expected}`, () => {
      const date = new Date(2026, month, 15);
      expect(getCurrentSeason(date)).toBe(expected);
    });
  }

  test("defaults to the current date when no argument is given", () => {
    const now = new Date();
    const expected = getCurrentSeason(now);
    expect(getCurrentSeason()).toBe(expected);
  });
});
