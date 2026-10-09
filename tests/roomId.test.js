import { describe, test, expect } from "bun:test";
import { generateRoomId, getRoomIdFromHash, buildRoomUrl } from "../js/roomId.js";

describe("generateRoomId", () => {
  test("returns an 8-character lowercase base36 string", () => {
    const id = generateRoomId();
    expect(id).toMatch(/^[0-9a-z]{8}$/);
  });

  test("produces different ids across many calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateRoomId()));
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe("getRoomIdFromHash", () => {
  test("parses a valid room hash", () => {
    expect(getRoomIdFromHash("#r=abc12345")).toBe("abc12345");
  });

  test("returns null for an empty hash", () => {
    expect(getRoomIdFromHash("")).toBeNull();
  });

  test("returns null for a hash with no room param", () => {
    expect(getRoomIdFromHash("#foo=bar")).toBeNull();
  });

  test("returns null for a malformed room id (wrong length)", () => {
    expect(getRoomIdFromHash("#r=short")).toBeNull();
  });

  test("returns null for a room id with invalid characters", () => {
    expect(getRoomIdFromHash("#r=ABC_1234")).toBeNull();
  });
});

describe("buildRoomUrl", () => {
  test("appends the room hash to a clean url", () => {
    expect(buildRoomUrl("https://drethi.github.io/Random_wheel/", "abc12345"))
      .toBe("https://drethi.github.io/Random_wheel/#r=abc12345");
  });

  test("replaces an existing hash", () => {
    expect(buildRoomUrl("https://drethi.github.io/Random_wheel/#r=old12345", "abc12345"))
      .toBe("https://drethi.github.io/Random_wheel/#r=abc12345");
  });
});
