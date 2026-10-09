import { describe, test, expect } from "bun:test";
import { validateNewName, MAX_NAMES, MAX_NAME_LENGTH } from "../js/validation.js";

describe("validateNewName", () => {
  test("accepts a normal name", () => {
    const result = validateNewName("Alice", 0);
    expect(result).toEqual({ ok: true, value: "Alice" });
  });

  test("trims surrounding whitespace", () => {
    const result = validateNewName("  Bob  ", 0);
    expect(result).toEqual({ ok: true, value: "Bob" });
  });

  test("rejects an empty string", () => {
    const result = validateNewName("", 0);
    expect(result.ok).toBe(false);
  });

  test("rejects a whitespace-only string", () => {
    const result = validateNewName("   ", 0);
    expect(result.ok).toBe(false);
  });

  test(`accepts a name exactly ${MAX_NAME_LENGTH} characters long`, () => {
    const name = "a".repeat(MAX_NAME_LENGTH);
    const result = validateNewName(name, 0);
    expect(result).toEqual({ ok: true, value: name });
  });

  test(`rejects a name longer than ${MAX_NAME_LENGTH} characters`, () => {
    const name = "a".repeat(MAX_NAME_LENGTH + 1);
    const result = validateNewName(name, 0);
    expect(result.ok).toBe(false);
  });

  test(`accepts when currentCount is one below ${MAX_NAMES}`, () => {
    const result = validateNewName("Zoe", MAX_NAMES - 1);
    expect(result.ok).toBe(true);
  });

  test(`rejects when currentCount is already at ${MAX_NAMES}`, () => {
    const result = validateNewName("Zoe", MAX_NAMES);
    expect(result.ok).toBe(false);
  });

  test("rejects a name that already exists in the list (exact match)", () => {
    const result = validateNewName("Alice", 1, ["Alice"]);
    expect(result).toEqual({ ok: false, error: "That name is already on the wheel." });
  });

  test("rejects a duplicate name regardless of case and surrounding whitespace", () => {
    const result = validateNewName("  aLICE  ", 1, ["Alice"]);
    expect(result.ok).toBe(false);
  });

  test("accepts a name that doesn't match any existing name", () => {
    const result = validateNewName("Bob", 1, ["Alice"]);
    expect(result).toEqual({ ok: true, value: "Bob" });
  });

  test("defaults to no duplicate check when existingTexts is omitted", () => {
    const result = validateNewName("Alice", 0);
    expect(result.ok).toBe(true);
  });
});
