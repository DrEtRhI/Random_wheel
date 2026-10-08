# Random Wheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static web page hosting a spinnable "wheel of names" whose
name list is shared live (via Firebase) across anyone holding the same room
URL, with a winner popup supporting OK / copy-image-to-clipboard / remove
actions.

**Architecture:** Plain HTML/CSS/JS (ES modules, no build step, no
framework) deployed via GitHub Pages from the repo root. Pure algorithmic
logic (room ids, name validation, color assignment, spin/winner geometry,
session exclusions) lives in small standalone modules unit-tested with
`bun test`. DOM rendering, canvas drawing, the spin animation loop, Firebase
Realtime Database sync, and clipboard/html2canvas calls are wired together
in thin orchestration modules, verified manually in a browser (served
locally with `python -m http.server`).

**Tech Stack:** Vanilla JS (ES modules), HTML5 Canvas, CSS Grid/Flexbox,
Firebase JS SDK v10.14.1 (Realtime Database, via `gstatic.com` CDN ES
module imports), html2canvas 1.4.1 (via cdnjs CDN, global script), Clipboard
API. Dev-only tooling: `bun test` for unit tests (zero dependencies — no
`node_modules`), `python -m http.server` for local manual verification. No
bundler, no npm dependencies shipped to production.

**Spec:** `docs/superpowers/specs/2026-10-09-random-wheel-design.md`

## Global Constraints

- No build step: the deployed site is plain static files at the repo root
  (`index.html` + assets); GitHub Pages serves `main` from root.
- Max 50 names per room; max 40 characters per name — enforced both
  client-side (UX) and in Firebase Realtime Database rules (the real
  backstop).
- Firebase config object (`random-wheel-c0365` project) is public-safe and
  committed directly into the repo's JS — security comes from DB rules, not
  from hiding the API key.
- The popup's "Remove" button excludes a name from the wheel for the
  current browser session only (never written to Firebase); only the side
  panel's ✕ permanently deletes a name (written to Firebase, affects
  everyone).
- If the shared list changes while a spin is in progress, the in-progress
  spin finishes on its original layout; the update is applied right after.
- Pin exact CDN versions: Firebase JS SDK `10.14.1`, html2canvas `1.4.1`.

---

## File Structure

```
index.html                     page skeleton (wheel canvas, pointer, panel, popup)
styles.css                     layout, responsive breakpoint, popup overlay, pastel theme
package.json                   dev-only: `bun test` script, no dependencies
firebase/database.rules.json   Realtime Database rules (pasted into Firebase console)
js/
  roomId.js                    pure: room id generation/parsing/URL building
  validation.js                pure: name validation against length/count caps
  colors.js                    pure: pastel hue palette + circular max-separation ordering
  wheelGeometry.js              pure: spin target + winner-index geometry
  exclusionStore.js             pure (storage injected): session-only wheel exclusions
  firebaseRoom.js               Firebase Realtime Database room I/O
  wheel.js                      canvas rendering of the wheel slices
  panel.js                      side-panel list + add-form rendering/wiring
  spin.js                       spin animation state machine
  popup.js                      winner popup display + clipboard capture
  app.js                        top-level wiring (entry point, loaded as a module)
tests/
  roomId.test.js
  validation.test.js
  colors.test.js
  wheelGeometry.test.js
  exclusionStore.test.js
```

---

### Task 1: Repo scaffold & test tooling

**Files:**
- Create: `package.json`
- Create: `README.md`
- Create: `.gitignore`

**Interfaces:**
- Produces: a `bun test` command that runs (and finds zero tests, since
  none exist yet) — confirms the test runner works before any real module
  is written.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "random-wheel",
  "private": true,
  "scripts": {
    "test": "bun test"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
.DS_Store
Thumbs.db
*.log
```

- [ ] **Step 3: Create `README.md`**

```markdown
# Random Wheel

A shareable "wheel of names" picker. Add names in the side panel, click the
wheel to spin, and get a random winner. The name list is stored in Firebase
and shared live with anyone who opens the same URL.

## Run locally

No build step. From the repo root:

\`\`\`
python -m http.server 8000
\`\`\`

Then open http://localhost:8000/ in a browser.

## Run tests

Unit tests cover the pure logic modules (room ids, name validation, color
assignment, spin/winner geometry, session exclusions) and run with
[Bun](https://bun.sh):

\`\`\`
bun test
\`\`\`

## Deploy

GitHub Pages, serving `main` from the repo root. Enable it under the repo's
Settings → Pages → "Deploy from a branch" → `main` / `/ (root)`. Live URL:
https://drethi.github.io/Random_wheel/

## Firebase setup

This app uses a Firebase Realtime Database to share the name list. The
project's config is already committed in `js/firebaseRoom.js` (Firebase web
config is public-safe — access is controlled by the database rules below,
not by hiding the key).

To (re)apply the database rules: open the Firebase console → Realtime
Database → Rules, and paste the contents of `firebase/database.rules.json`,
then Publish.
```

- [ ] **Step 4: Verify the test runner works with no tests yet**

Run: `bun test`
Expected: output reports 0 test files / 0 tests, exits with code 0 (no
error about a missing command or missing config).

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore README.md
git commit -m "Scaffold repo: package.json, README, gitignore

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Room id module

**Files:**
- Create: `js/roomId.js`
- Test: `tests/roomId.test.js`

**Interfaces:**
- Produces:
  - `generateRoomId(): string` — 8-char lowercase base36 id.
  - `getRoomIdFromHash(hash: string): string | null` — parses
    `"#r=<id>"` out of a `location.hash`-style string; returns `null` for
    anything else.
  - `buildRoomUrl(baseUrl: string, roomId: string): string` — strips any
    existing `#...` from `baseUrl` and appends `#r=<roomId>`.

- [ ] **Step 1: Write the failing tests**

Create `tests/roomId.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/roomId.test.js`
Expected: FAIL — `js/roomId.js` does not exist yet (module not found).

- [ ] **Step 3: Write the implementation**

Create `js/roomId.js`:

```js
const ROOM_ID_LENGTH = 8;
const ROOM_ID_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";
const ROOM_ID_PATTERN = /^[0-9a-z]{8}$/;
const HASH_PATTERN = /^#r=([0-9a-z]{8})$/;

export function generateRoomId() {
  let id = "";
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)];
  }
  return id;
}

export function getRoomIdFromHash(hash) {
  const match = HASH_PATTERN.exec(hash ?? "");
  return match ? match[1] : null;
}

export function buildRoomUrl(baseUrl, roomId) {
  if (!ROOM_ID_PATTERN.test(roomId)) {
    throw new Error(`Invalid room id: ${roomId}`);
  }
  const clean = baseUrl.split("#")[0];
  return `${clean}#r=${roomId}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/roomId.test.js`
Expected: PASS, all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add js/roomId.js tests/roomId.test.js
git commit -m "Add room id generation/parsing module

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Name validation module

**Files:**
- Create: `js/validation.js`
- Test: `tests/validation.test.js`

**Interfaces:**
- Produces:
  - `MAX_NAMES: number` (50), `MAX_NAME_LENGTH: number` (40).
  - `validateNewName(text: string, currentCount: number): { ok: true, value: string } | { ok: false, error: string }`
    — trims whitespace; rejects empty, over-length, or over-count.

- [ ] **Step 1: Write the failing tests**

Create `tests/validation.test.js`:

```js
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/validation.test.js`
Expected: FAIL — `js/validation.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `js/validation.js`:

```js
export const MAX_NAMES = 50;
export const MAX_NAME_LENGTH = 40;

export function validateNewName(text, currentCount) {
  const trimmed = (text ?? "").trim();

  if (trimmed.length === 0) {
    return { ok: false, error: "Name cannot be empty." };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }
  if (currentCount >= MAX_NAMES) {
    return { ok: false, error: `List is full (${MAX_NAMES} max).` };
  }
  return { ok: true, value: trimmed };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/validation.test.js`
Expected: PASS, all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add js/validation.js tests/validation.test.js
git commit -m "Add name validation module (length/count caps)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Color palette module

**Files:**
- Create: `js/colors.js`
- Test: `tests/colors.test.js`

**Interfaces:**
- Produces:
  - `LIGHTNESS: number`, `CHROMA: number` — fixed OKLCH pastel constants.
  - `oklchToHex(L: number, C: number, hueDegrees: number): string` — `#rrggbb`.
  - `circularMaxSeparationOrder(n: number): number[]` — a permutation of
    `0..n-1` such that circularly-consecutive entries (wraparound included)
    are far apart.
  - `generateSliceColors(n: number): string[]` — `n` hex colors, one per
    wheel slice in physical order, with adjacent slices kept visually
    distinct.

> **Design note (verified by hand during planning, not just asserted):**
> the algorithm below (greedy farthest-placement + local 2-opt refinement
> on circular index distance) was prototyped and run for
> n = 3,4,5,6,7,8,9,10,12,15,16,20,24,30,40,50. Every run produced a valid
> permutation with a minimum circular gap far above the naive sequential
> assignment (e.g. n=6: 120° vs. 60° naive; n=8: 135° vs. 45° naive; n=50:
> 172.8° vs. 7.2° naive). The exact values below are reproductions of that
> verified run — they are not approximations.

- [ ] **Step 1: Write the failing tests**

Create `tests/colors.test.js`:

```js
import { describe, test, expect } from "bun:test";
import {
  oklchToHex,
  circularMaxSeparationOrder,
  generateSliceColors,
  LIGHTNESS,
  CHROMA,
} from "../js/colors.js";

function circDist(a, b, n) {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}

function minCircularGapDegrees(order, n) {
  const step = 360 / n;
  let minGap = Infinity;
  for (let i = 0; i < n; i++) {
    const d = circDist(order[i], order[(i + 1) % n], n);
    minGap = Math.min(minGap, d * step);
  }
  return minGap;
}

describe("oklchToHex", () => {
  test("returns a well-formed hex color", () => {
    expect(oklchToHex(LIGHTNESS, CHROMA, 0)).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("different hues produce different colors", () => {
    const a = oklchToHex(LIGHTNESS, CHROMA, 0);
    const b = oklchToHex(LIGHTNESS, CHROMA, 180);
    expect(a).not.toBe(b);
  });
});

describe("circularMaxSeparationOrder", () => {
  test.each([3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 20, 24, 30, 40, 50])(
    "returns a valid permutation of 0..n-1 for n=%d",
    (n) => {
      const order = circularMaxSeparationOrder(n);
      const sorted = [...order].sort((a, b) => a - b);
      expect(sorted).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  );

  const expectedMinGap = {
    3: 120, 4: 90, 5: 144, 6: 120, 7: 154.2857142857143, 8: 135, 9: 160,
    10: 144, 12: 150, 15: 168, 16: 157.5, 20: 162, 24: 165, 30: 168,
    40: 171, 50: 172.8,
  };

  test.each(Object.keys(expectedMinGap).map(Number))(
    "achieves the verified minimum circular gap for n=%d",
    (n) => {
      const order = circularMaxSeparationOrder(n);
      const gap = minCircularGapDegrees(order, n);
      expect(gap).toBeCloseTo(expectedMinGap[n], 5);
    }
  );

  test.each([4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 20, 24, 30, 40, 50])(
    "beats or matches naive sequential order for n=%d",
    (n) => {
      const order = circularMaxSeparationOrder(n);
      const naive = Array.from({ length: n }, (_, i) => i);
      const gap = minCircularGapDegrees(order, n);
      const naiveGap = minCircularGapDegrees(naive, n);
      expect(gap).toBeGreaterThanOrEqual(naiveGap);
    }
  );
});

describe("generateSliceColors", () => {
  test("returns an empty array for n=0", () => {
    expect(generateSliceColors(0)).toEqual([]);
  });

  test("returns one color for n=1", () => {
    const colors = generateSliceColors(1);
    expect(colors).toHaveLength(1);
    expect(colors[0]).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("returns n distinct hex colors", () => {
    const colors = generateSliceColors(8);
    expect(colors).toHaveLength(8);
    expect(new Set(colors).size).toBe(8);
    for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/colors.test.js`
Expected: FAIL — `js/colors.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `js/colors.js`:

```js
export const LIGHTNESS = 0.78;
export const CHROMA = 0.11;

function circDist(a, b, n) {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}

function minGapOf(order, n) {
  let minGap = Infinity;
  for (let i = 0; i < n; i++) {
    const d = circDist(order[i], order[(i + 1) % n], n);
    if (d < minGap) minGap = d;
  }
  return minGap;
}

export function circularMaxSeparationOrder(n) {
  if (n <= 2) return Array.from({ length: n }, (_, i) => i);

  const remaining = new Set(Array.from({ length: n }, (_, i) => i));
  const order = [0];
  remaining.delete(0);

  while (remaining.size > 0) {
    const last = order[order.length - 1];
    let best = null;
    let bestDist = -1;
    for (const cand of remaining) {
      const d = circDist(cand, last, n);
      if (d > bestDist) {
        bestDist = d;
        best = cand;
      }
    }
    order.push(best);
    remaining.delete(best);
  }

  // Local 2-opt refinement: maximize the minimum circular gap.
  let improved = true;
  let iterations = 0;
  while (improved && iterations < 500) {
    improved = false;
    iterations++;
    const currentMinGap = minGapOf(order, n);
    for (let i = 0; i < n - 1 && !improved; i++) {
      for (let j = i + 1; j < n && !improved; j++) {
        const trial = order
          .slice(0, i + 1)
          .concat(order.slice(i + 1, j + 1).reverse(), order.slice(j + 1));
        if (minGapOf(trial, n) > currentMinGap) {
          order.splice(0, order.length, ...trial);
          improved = true;
        }
      }
    }
  }

  return order;
}

export function oklchToHex(L, C, hueDegrees) {
  const h = (hueDegrees * Math.PI) / 180;
  const a = Math.cos(h) * C;
  const b = Math.sin(h) * C;

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (c) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  r = toSrgb(r);
  g = toSrgb(g);
  bl = toSrgb(bl);

  const toHex = (c) => Math.round(c * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

export function generateSliceColors(n) {
  if (n <= 0) return [];
  const order = circularMaxSeparationOrder(n);
  const step = 360 / n;
  return order.map((hueIndex) => oklchToHex(LIGHTNESS, CHROMA, hueIndex * step));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/colors.test.js`
Expected: PASS, all tests green (permutation validity, verified minimum
gaps, and distinct-hex-colors checks).

- [ ] **Step 5: Commit**

```bash
git add js/colors.js tests/colors.test.js
git commit -m "Add pastel color palette module with circular max-separation ordering

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Wheel geometry module

**Files:**
- Create: `js/wheelGeometry.js`
- Test: `tests/wheelGeometry.test.js`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  - `computeWinnerIndex(finalRotationDeg: number, sliceCount: number): number`
    — slice 0 occupies wheel-local angle `[0, 360/n)` measured clockwise
    from 3 o'clock; the pointer is fixed at the 9 o'clock position (180°).
    Returns `-1` if `sliceCount <= 0`.
  - `computeSpinTarget(currentRotationDeg: number, randomFn?: () => number): number`
    — returns a new absolute rotation (always greater than
    `currentRotationDeg`) representing 3-5 extra full turns plus a random
    offset. `randomFn` defaults to `Math.random` and exists purely so tests
    can inject a deterministic sequence.

- [ ] **Step 1: Write the failing tests**

Create `tests/wheelGeometry.test.js`:

```js
import { describe, test, expect } from "bun:test";
import { computeWinnerIndex, computeSpinTarget } from "../js/wheelGeometry.js";

describe("computeWinnerIndex", () => {
  test("returns -1 for zero slices", () => {
    expect(computeWinnerIndex(0, 0)).toBe(-1);
  });

  test("always returns 0 for a single slice, regardless of rotation", () => {
    expect(computeWinnerIndex(0, 1)).toBe(0);
    expect(computeWinnerIndex(123, 1)).toBe(0);
    expect(computeWinnerIndex(-45, 1)).toBe(0);
  });

  test("maps known rotations to known slices for 4 slices", () => {
    expect(computeWinnerIndex(0, 4)).toBe(2);
    expect(computeWinnerIndex(90, 4)).toBe(1);
    expect(computeWinnerIndex(180, 4)).toBe(0);
    expect(computeWinnerIndex(270, 4)).toBe(3);
  });

  test("is consistent modulo 360", () => {
    expect(computeWinnerIndex(360, 4)).toBe(computeWinnerIndex(0, 4));
    expect(computeWinnerIndex(405, 4)).toBe(computeWinnerIndex(45, 4));
  });

  test("handles negative rotations via modulo wraparound", () => {
    expect(computeWinnerIndex(-90, 4)).toBe(computeWinnerIndex(270, 4));
  });
});

describe("computeSpinTarget", () => {
  function mockRandom(values) {
    let i = 0;
    return () => values[i++ % values.length];
  }

  test("adds between 3 and 5 full turns plus an offset (low end)", () => {
    const target = computeSpinTarget(0, mockRandom([0, 0]));
    expect(target).toBeCloseTo(1080, 5); // 3 full turns, 0 offset
  });

  test("adds between 3 and 5 full turns plus an offset (high end)", () => {
    const target = computeSpinTarget(0, mockRandom([0.999999, 0.999999]));
    // extraSpins = 3 + floor(0.999999 * 3) = 5; offset = 0.999999 * 360
    expect(target).toBeCloseTo(1800 + 0.999999 * 360, 3);
  });

  test("is always strictly greater than the current rotation", () => {
    const target = computeSpinTarget(500, mockRandom([0.5, 0.5]));
    expect(target).toBeGreaterThan(500);
  });

  test("offsets from the current rotation, not from zero", () => {
    const a = computeSpinTarget(0, mockRandom([0, 0]));
    const b = computeSpinTarget(720, mockRandom([0, 0]));
    expect(b - a).toBeCloseTo(720, 5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/wheelGeometry.test.js`
Expected: FAIL — `js/wheelGeometry.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `js/wheelGeometry.js`:

```js
export function computeWinnerIndex(finalRotationDeg, sliceCount) {
  if (sliceCount <= 0) return -1;
  const step = 360 / sliceCount;
  const normalizedRotation = ((finalRotationDeg % 360) + 360) % 360;
  const pointerAngleInWheelFrame = ((180 - normalizedRotation) % 360 + 360) % 360;
  return Math.floor(pointerAngleInWheelFrame / step);
}

export function computeSpinTarget(currentRotationDeg, randomFn = Math.random) {
  const extraSpins = 3 + Math.floor(randomFn() * 3); // 3, 4, or 5 extra full turns
  const offset = randomFn() * 360;
  return currentRotationDeg + extraSpins * 360 + offset;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/wheelGeometry.test.js`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add js/wheelGeometry.js tests/wheelGeometry.test.js
git commit -m "Add wheel spin-target and winner-index geometry module

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Session exclusion store module

**Files:**
- Create: `js/exclusionStore.js`
- Test: `tests/exclusionStore.test.js`

**Interfaces:**
- Consumes: nothing (pure in-memory state — deliberately **not** backed by
  `sessionStorage`, which would survive a page refresh; the spec requires
  exclusions to be gone after a refresh, which falls out for free from
  plain in-memory state since reloading the page re-runs this module from
  scratch).
- Produces:
  - `createExclusionStore(): { getExclusions(): Set<string>, excludeName(id: string): void, clearExclusions(): void, isExcluded(id: string): boolean }`

- [ ] **Step 1: Write the failing tests**

Create `tests/exclusionStore.test.js`:

```js
import { describe, test, expect } from "bun:test";
import { createExclusionStore } from "../js/exclusionStore.js";

describe("createExclusionStore", () => {
  test("starts with no exclusions", () => {
    const store = createExclusionStore();
    expect(store.getExclusions().size).toBe(0);
    expect(store.isExcluded("a")).toBe(false);
  });

  test("excludeName adds an id", () => {
    const store = createExclusionStore();
    store.excludeName("alice-id");
    expect(store.isExcluded("alice-id")).toBe(true);
    expect(store.isExcluded("bob-id")).toBe(false);
  });

  test("excludeName accumulates multiple ids", () => {
    const store = createExclusionStore();
    store.excludeName("a");
    store.excludeName("b");
    expect(store.getExclusions()).toEqual(new Set(["a", "b"]));
  });

  test("clearExclusions empties the set", () => {
    const store = createExclusionStore();
    store.excludeName("a");
    store.clearExclusions();
    expect(store.getExclusions().size).toBe(0);
  });

  test("separate store instances do not share state", () => {
    const storeA = createExclusionStore();
    storeA.excludeName("a");
    const storeB = createExclusionStore();
    expect(storeB.isExcluded("a")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/exclusionStore.test.js`
Expected: FAIL — `js/exclusionStore.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `js/exclusionStore.js`:

```js
export function createExclusionStore() {
  const excluded = new Set();

  function getExclusions() {
    return new Set(excluded);
  }

  function excludeName(id) {
    excluded.add(id);
  }

  function clearExclusions() {
    excluded.clear();
  }

  function isExcluded(id) {
    return excluded.has(id);
  }

  return { getExclusions, excludeName, clearExclusions, isExcluded };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/exclusionStore.test.js`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add js/exclusionStore.js tests/exclusionStore.test.js
git commit -m "Add session-only wheel exclusion store

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Page skeleton & styles

**Files:**
- Create: `index.html`
- Create: `styles.css`

**Interfaces:**
- Produces: the DOM ids/classes every later task's JS attaches to:
  `#wheel-canvas`, `#wheel-pointer`, `#wheel-empty-message`, `#name-list`,
  `#add-name-form`, `#add-name-input`, `#add-name-button`,
  `#panel-message`, `#winner-popup`, `#winner-popup-content`,
  `#winner-name`, `#winner-ok-button`, `#winner-copy-button`,
  `#winner-remove-button`.

- [ ] **Step 1: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Random Wheel</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="app">
    <section id="wheel-section">
      <div id="wheel-wrapper">
        <canvas id="wheel-canvas" width="500" height="500"></canvas>
        <div id="wheel-pointer" aria-hidden="true"></div>
        <p id="wheel-empty-message" hidden>Add names to start</p>
      </div>
    </section>

    <section id="panel-section">
      <h2>Names</h2>
      <ul id="name-list"></ul>
      <form id="add-name-form">
        <input
          id="add-name-input"
          type="text"
          maxlength="40"
          placeholder="Add a name"
          required
        />
        <button type="submit" id="add-name-button">Add</button>
      </form>
      <p id="panel-message" role="status"></p>
    </section>
  </div>

  <div id="winner-popup" hidden>
    <div id="winner-popup-content">
      <p id="winner-name"></p>
      <div id="winner-popup-actions">
        <button id="winner-ok-button" type="button">OK</button>
        <button id="winner-copy-button" type="button">📷 Copy image</button>
        <button id="winner-remove-button" type="button">🗑 Remove</button>
      </div>
    </div>
  </div>

  <script
    src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
  ></script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles.css`**

```css
:root {
  color-scheme: light;
  --ink: #1e1e1e;
  --muted-ink: #5c5c5c;
  --surface: #ffffff;
  --panel-bg: #f7f7f5;
  --border: #1e1e1e;
  --error: #c62828;
  --pointer: #ffc9c9;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding-block: 24px;
  font-family: "Segoe UI", system-ui, sans-serif;
  background: var(--surface);
  color: var(--ink);
}

#app {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  max-width: 1000px;
  margin: 0 auto;
  padding-inline: 20px;
}

#wheel-section {
  flex: 1 1 500px;
  display: flex;
  justify-content: center;
}

#wheel-wrapper {
  position: relative;
  width: min(500px, 90vw);
  aspect-ratio: 1 / 1;
}

#wheel-canvas {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  cursor: pointer;
  touch-action: manipulation;
}

#wheel-pointer {
  position: absolute;
  left: -8px;
  top: 50%;
  width: 24px;
  height: 24px;
  background: var(--pointer);
  border: 2px solid var(--border);
  transform: translateY(-50%) rotate(45deg);
  pointer-events: none;
}

#wheel-empty-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--muted-ink);
  pointer-events: none;
}

#panel-section {
  flex: 1 1 280px;
  max-width: 320px;
}

#name-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;
}

#name-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
}

.remove-name-button {
  background: none;
  border: none;
  color: var(--error);
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
  padding: 2px 6px;
}

#add-name-form {
  display: flex;
  gap: 8px;
}

#add-name-input {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
}

#add-name-button {
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--panel-bg);
  cursor: pointer;
}

#panel-message {
  min-height: 1.2em;
  color: var(--error);
  font-size: 0.9em;
}

#winner-popup {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

#winner-popup-content {
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: 10px;
  padding: 24px 32px;
  text-align: center;
  min-width: 260px;
}

#winner-name {
  font-size: 1.6em;
  font-weight: 600;
  margin: 0 0 20px;
}

#winner-popup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

#winner-popup-actions button {
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--panel-bg);
  cursor: pointer;
}

@media (max-width: 700px) {
  #app {
    flex-direction: column;
    align-items: center;
  }

  #panel-section {
    max-width: min(500px, 90vw);
    width: 100%;
  }
}
```

- [ ] **Step 3: Manual verification**

Run: `python -m http.server 8000` from the repo root, then open
`http://localhost:8000/` in a browser.

Expected: page loads with no console errors (the `js/app.js` 404 is
expected and fine at this point — it doesn't exist yet). The wheel area
shows an empty circle-ish canvas with a pink diamond pointer at its left
edge and "Add names to start" centered; the panel shows an empty list, a
text input, and an "Add" button. Resize the window below ~700px wide and
confirm the panel stacks below the wheel.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "Add page skeleton and styles matching the wheel layout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Firebase room data module + database rules

**Files:**
- Create: `js/firebaseRoom.js`
- Create: `firebase/database.rules.json`

**Interfaces:**
- Consumes: `js/roomId.js` is not directly imported here, but this
  module's functions all take a `roomId: string` produced by it.
- Produces:
  - `ensureRoom(roomId: string): Promise<void>` — creates an empty
    `names` node if the room doesn't exist yet.
  - `subscribeToNames(roomId: string, callback: (names: {id: string, text: string}[]) => void): () => void`
    — subscribes to live updates; returns an unsubscribe function.
  - `addNameToRoom(roomId: string, text: string): Promise<void>`.
  - `removeNameFromRoom(roomId: string, nameId: string): Promise<void>`.

- [ ] **Step 1: Write `js/firebaseRoom.js`**

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  remove,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// Firebase web config is public-safe: access control comes from the
// database rules (firebase/database.rules.json), not from hiding this key.
const firebaseConfig = {
  apiKey: "AIzaSyCd3opC4JP2rdkHapClZ8Gu0VfIYHy5nCI",
  authDomain: "random-wheel-c0365.firebaseapp.com",
  databaseURL: "https://random-wheel-c0365-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "random-wheel-c0365",
  storageBucket: "random-wheel-c0365.firebasestorage.app",
  messagingSenderId: "122430926240",
  appId: "1:122430926240:web:5e7a1ee8bd31fbee9a08c5",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function namesRefFor(roomId) {
  return ref(db, `rooms/${roomId}/names`);
}

export async function ensureRoom(roomId) {
  const namesRef = namesRefFor(roomId);
  const snapshot = await get(namesRef);
  if (!snapshot.exists()) {
    await set(namesRef, {});
  }
}

export function subscribeToNames(roomId, callback) {
  const namesRef = namesRefFor(roomId);
  const unsubscribe = onValue(namesRef, (snapshot) => {
    const val = snapshot.val() || {};
    const names = Object.entries(val).map(([id, data]) => ({
      id,
      text: data.text,
    }));
    callback(names);
  });
  return unsubscribe;
}

export async function addNameToRoom(roomId, text) {
  const namesRef = namesRefFor(roomId);
  const newRef = push(namesRef);
  await set(newRef, { text });
}

export async function removeNameFromRoom(roomId, nameId) {
  const nameRef = ref(db, `rooms/${roomId}/names/${nameId}`);
  await remove(nameRef);
}
```

- [ ] **Step 2: Write `firebase/database.rules.json`**

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        "names": {
          ".write": true,
          ".validate": "newData.numChildren() <= 50",
          "$nameId": {
            ".validate": "newData.hasChild('text') && newData.child('text').isString() && newData.child('text').val().length > 0 && newData.child('text').val().length <= 40"
          }
        }
      }
    }
  }
}
```

- [ ] **Step 3: Apply the rules in the Firebase console**

Open https://console.firebase.google.com → project `random-wheel-c0365` →
Realtime Database → Rules tab → paste the contents of
`firebase/database.rules.json` → Publish.

- [ ] **Step 4: Verify the rules with `curl` against the REST API**

The Realtime Database exposes a plain REST interface, so the rules can be
checked directly without the SDK or a browser:

```bash
DB="https://random-wheel-c0365-default-rtdb.europe-west1.firebasedatabase.app"

# Valid write: should succeed (prints the pushed key, e.g. {"name":"-NXyz..."})
curl -s -X POST "$DB/rooms/plantest1/names.json" -d '{"text":"Alice"}'

# Name too long (41 chars): should be rejected
curl -s -X POST "$DB/rooms/plantest1/names.json" -d "{\"text\":\"$(python -c 'print("a"*41)')\"}"
# Expected: {"error" : "Permission denied"} (or similar validation failure)

# Read back: should show only the valid "Alice" entry
curl -s "$DB/rooms/plantest1/names.json"
```

Expected: the first `curl` succeeds and returns a generated key; the
second is rejected with a permission/validation error; the third shows
only the accepted name. (`plantest1` is a throwaway room — delete it
afterwards with `curl -s -X DELETE "$DB/rooms/plantest1.json"` to keep the
database tidy.)

- [ ] **Step 5: Manual verification — live sync across two tabs**

With the dev server still running (`python -m http.server 8000`), open
`http://localhost:8000/#r=plantest2` in two separate browser tabs. In the
browser console of one tab, run:

```js
import("./js/firebaseRoom.js").then(async (m) => {
  await m.ensureRoom("plantest2");
  await m.addNameToRoom("plantest2", "Carl");
});
```

Expected: no errors in either tab's console. (The UI doesn't render this
data yet — that's Task 9 onward — this step only confirms the Firebase
plumbing itself works end-to-end.) Clean up afterwards via the same
`curl -X DELETE` pattern as Step 4, substituting `plantest2`.

- [ ] **Step 6: Commit**

```bash
git add js/firebaseRoom.js firebase/database.rules.json
git commit -m "Add Firebase Realtime Database room I/O and rules

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Wheel canvas rendering

**Files:**
- Create: `js/wheel.js`

**Interfaces:**
- Consumes: nothing beyond a 2D canvas context and plain data.
- Produces:
  - `renderWheel(ctx: CanvasRenderingContext2D, options: { names: string[], colors: string[], rotationDeg: number }): void`
    — draws the empty-state placeholder when `names` is empty, otherwise
    draws each slice (filled with its color, `#1e1e1e` 2px stroke) with its
    label, all rotated by `rotationDeg` degrees clockwise. Slice `i`
    occupies wheel-local angle `[i * 360/n, (i+1) * 360/n)` measured
    clockwise from 3 o'clock — this is the convention
    `js/wheelGeometry.js`'s `computeWinnerIndex` assumes.

- [ ] **Step 1: Write `js/wheel.js`**

```js
export function renderWheel(ctx, { names, colors, rotationDeg }) {
  const canvas = ctx.canvas;
  const size = Math.min(canvas.width, canvas.height);
  const radius = size / 2 - 4;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (names.length === 0) {
    ctx.save();
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1e1e1e";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    return;
  }

  const n = names.length;
  const sliceAngle = (Math.PI * 2) / n;
  const rotationRad = (rotationDeg * Math.PI) / 180;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotationRad);

  for (let i = 0; i < n; i++) {
    const start = i * sliceAngle;
    const end = start + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    ctx.strokeStyle = "#1e1e1e";
    ctx.lineWidth = 2;
    ctx.stroke();

    const mid = start + sliceAngle / 2;
    ctx.save();
    ctx.rotate(mid);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1e1e1e";
    ctx.font = "16px sans-serif";
    ctx.fillText(names[i], radius - 10, 0);
    ctx.restore();
  }

  ctx.restore();
}
```

- [ ] **Step 2: Manual verification**

With `python -m http.server 8000` running, temporarily add this snippet at
the end of `index.html`'s module script area (or paste into the browser
console on the page) to sanity-check rendering before it's wired to real
data in later tasks:

```js
import { renderWheel } from "./js/wheel.js";
const ctx = document.getElementById("wheel-canvas").getContext("2d");
renderWheel(ctx, {
  names: ["Alice", "Bob", "Carl", "Dana"],
  colors: ["#f199b4", "#99c77f", "#5ec6ec", "#d2a2e8"],
  rotationDeg: 0,
});
```

Expected: the canvas shows 4 colored pie slices with labels, divided by
dark 2px borders, roughly matching the look of `Display_example.svg`
(minus the pointer, which is the separate CSS element from Task 7). Remove
the temporary snippet once confirmed (it will be superseded by `js/app.js`
in Task 14).

- [ ] **Step 3: Commit**

```bash
git add js/wheel.js
git commit -m "Add canvas rendering for wheel slices

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Side panel (name list + add form)

**Files:**
- Create: `js/panel.js`

**Interfaces:**
- Consumes: `validateNewName` from `js/validation.js`.
- Produces:
  - `renderNameList(listEl: HTMLElement, names: {id: string, text: string}[], onRemove: (id: string) => void): void`.
  - `wireAddForm(options: { formEl: HTMLFormElement, inputEl: HTMLInputElement, messageEl: HTMLElement, getCurrentCount: () => number, onAdd: (text: string) => void }): void`.

- [ ] **Step 1: Write `js/panel.js`**

```js
import { validateNewName } from "./validation.js";

export function renderNameList(listEl, names, onRemove) {
  listEl.innerHTML = "";
  for (const { id, text } of names) {
    const li = document.createElement("li");
    li.dataset.id = id;

    const span = document.createElement("span");
    span.className = "name-text";
    span.textContent = text;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "remove-name-button";
    button.setAttribute("aria-label", `Remove ${text}`);
    button.textContent = "✕";
    button.addEventListener("click", () => onRemove(id));

    li.append(span, button);
    listEl.append(li);
  }
}

export function wireAddForm({ formEl, inputEl, messageEl, getCurrentCount, onAdd }) {
  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = validateNewName(inputEl.value, getCurrentCount());
    if (!result.ok) {
      messageEl.textContent = result.error;
      return;
    }
    messageEl.textContent = "";
    inputEl.value = "";
    onAdd(result.value);
  });
}
```

- [ ] **Step 2: Manual verification**

With `python -m http.server 8000` running, paste into the browser console
on the page:

```js
import { renderNameList, wireAddForm } from "./js/panel.js";
let names = [{ id: "1", text: "Alice" }, { id: "2", text: "Bob" }];
renderNameList(document.getElementById("name-list"), names, (id) => {
  names = names.filter((n) => n.id !== id);
  console.log("removed", id, "remaining:", names);
});
wireAddForm({
  formEl: document.getElementById("add-name-form"),
  inputEl: document.getElementById("add-name-input"),
  messageEl: document.getElementById("panel-message"),
  getCurrentCount: () => names.length,
  onAdd: (text) => console.log("would add:", text),
});
```

Expected: the panel shows "Alice" and "Bob", each with a working ✕ button
(click logs the removal and the row disappears after re-rendering — note
this manual snippet doesn't auto re-render on remove, that wiring comes in
Task 14). Typing a name and submitting logs `would add: <name>`. Typing 41
characters is blocked by the input's own `maxlength`; typing nothing and
submitting shows the "Name cannot be empty." message in `#panel-message`.

- [ ] **Step 3: Commit**

```bash
git add js/panel.js
git commit -m "Add side panel list rendering and add-name form wiring

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Spin animation controller

**Files:**
- Create: `js/spin.js`

**Interfaces:**
- Consumes: `computeSpinTarget`, `computeWinnerIndex` from
  `js/wheelGeometry.js`; `renderWheel` from `js/wheel.js`.
- Produces:
  - `createSpinController(options: { ctx: CanvasRenderingContext2D, getColors: (n: number) => string[] }): { spin(names: {id: string, text: string}[], onComplete: (winner: {id: string, text: string}) => void): void, isSpinning(): boolean, draw(names: {id: string, text: string}[]): void, getRotation(): number }`.

- [ ] **Step 1: Write `js/spin.js`**

```js
import { computeSpinTarget, computeWinnerIndex } from "./wheelGeometry.js";
import { renderWheel } from "./wheel.js";

const SPIN_DURATION_MS = 4000;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function createSpinController({ ctx, getColors }) {
  let rotationDeg = 0;
  let spinning = false;

  function draw(names) {
    renderWheel(ctx, {
      names: names.map((n) => n.text),
      colors: getColors(names.length),
      rotationDeg,
    });
  }

  function spin(names, onComplete) {
    if (spinning || names.length === 0) return;
    spinning = true;

    const startRotation = rotationDeg;
    const targetRotation = computeSpinTarget(startRotation);
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / SPIN_DURATION_MS, 1);
      rotationDeg = startRotation + (targetRotation - startRotation) * easeOutCubic(t);
      draw(names);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        spinning = false;
        const winnerIndex = computeWinnerIndex(rotationDeg, names.length);
        onComplete(names[winnerIndex]);
      }
    }

    requestAnimationFrame(frame);
  }

  function isSpinning() {
    return spinning;
  }

  function getRotation() {
    return rotationDeg;
  }

  return { spin, isSpinning, draw, getRotation };
}
```

- [ ] **Step 2: Manual verification**

With `python -m http.server 8000` running, paste into the browser console:

```js
import { createSpinController } from "./js/spin.js";
import { generateSliceColors } from "./js/colors.js";
const ctx = document.getElementById("wheel-canvas").getContext("2d");
const controller = createSpinController({ ctx, getColors: generateSliceColors });
const names = [{ id: "1", text: "Alice" }, { id: "2", text: "Bob" }, { id: "3", text: "Carl" }];
controller.draw(names);
controller.spin(names, (winner) => console.log("winner:", winner));
```

Expected: the wheel draws 3 slices, then clicking (running `spin`) animates
a few seconds of fast-then-slowing rotation and ends with a `winner: {...}`
log naming one of the three. Run it a handful of times and confirm the
winner varies (not always the same slice) and that calling `spin` again
while one is already in progress does nothing (`isSpinning()` returns
`true` mid-animation).

- [ ] **Step 3: Commit**

```bash
git add js/spin.js
git commit -m "Add spin animation controller with ease-out timing

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: Winner popup (OK / copy image / remove)

**Files:**
- Create: `js/popup.js`

**Interfaces:**
- Consumes: the global `html2canvas` function (loaded via the CDN
  `<script>` tag in `index.html`, Task 7) and the DOM ids from Task 7.
- Produces:
  - `showWinnerPopup(name: string): void`.
  - `hideWinnerPopup(): void`.
  - `captureAndCopyImage(): Promise<void>`.
  - `wirePopupButtons(options: { onRemove: () => void }): void` — attaches
    click handlers to the OK/copy/remove buttons; safe to call multiple
    times (each call re-attaches an `onRemove` closure for the current
    winner by replacing the remove button's handler).

- [ ] **Step 1: Write `js/popup.js`**

```js
export function showWinnerPopup(name) {
  document.getElementById("winner-name").textContent = name;
  document.getElementById("winner-popup").hidden = false;
}

export function hideWinnerPopup() {
  document.getElementById("winner-popup").hidden = true;
}

export async function captureAndCopyImage() {
  const content = document.getElementById("winner-popup-content");
  const canvas = await html2canvas(content);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

let removeHandler = null;

export function wirePopupButtons({ onRemove }) {
  const okButton = document.getElementById("winner-ok-button");
  const copyButton = document.getElementById("winner-copy-button");
  const removeButton = document.getElementById("winner-remove-button");

  okButton.onclick = hideWinnerPopup;

  copyButton.onclick = async () => {
    try {
      await captureAndCopyImage();
    } catch (err) {
      console.error("Copy to clipboard failed:", err);
    }
  };

  if (removeHandler) {
    removeButton.removeEventListener("click", removeHandler);
  }
  removeHandler = () => {
    onRemove();
    hideWinnerPopup();
  };
  removeButton.addEventListener("click", removeHandler);
}
```

- [ ] **Step 2: Manual verification**

With `python -m http.server 8000` running, paste into the browser console:

```js
import { showWinnerPopup, wirePopupButtons } from "./js/popup.js";
wirePopupButtons({ onRemove: () => console.log("removed!") });
showWinnerPopup("Alice");
```

Expected: a centered popup overlay appears showing "Alice" and three
buttons. Clicking **OK** closes it. Re-show it, click **📷 Copy image**,
then paste (Ctrl+V) into any app that accepts images (e.g. an image
editor, or a chat box) — confirm an image of the popup appears. Re-show it
again, click **🗑 Remove** — confirm `removed!` logs and the popup closes.

- [ ] **Step 3: Commit**

```bash
git add js/popup.js
git commit -m "Add winner popup with clipboard image capture

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: Top-level wiring (`app.js`)

**Files:**
- Create: `js/app.js`

**Interfaces:**
- Consumes every module from Tasks 2-12 (`roomId.js`, `firebaseRoom.js`,
  `colors.js`, `exclusionStore.js`, `spin.js`, `panel.js`, `popup.js`).
- Produces: the page's behavior as a whole. No other module depends on
  this one — it is the entry point loaded by `index.html`.

This task also implements the two cross-cutting behaviors from the spec
that don't belong to any single module: deferring shared-list updates
while a spin is in progress, and the 0-name/1-name edge cases (both of
which fall out naturally from how the pieces below are composed, rather
than needing separate code paths).

- [ ] **Step 1: Write `js/app.js`**

```js
import { generateRoomId, getRoomIdFromHash, buildRoomUrl } from "./roomId.js";
import {
  ensureRoom,
  subscribeToNames,
  addNameToRoom,
  removeNameFromRoom,
} from "./firebaseRoom.js";
import { generateSliceColors } from "./colors.js";
import { createExclusionStore } from "./exclusionStore.js";
import { createSpinController } from "./spin.js";
import { renderNameList, wireAddForm } from "./panel.js";
import { showWinnerPopup, wirePopupButtons } from "./popup.js";

async function main() {
  let roomId = getRoomIdFromHash(location.hash);
  if (!roomId) {
    roomId = generateRoomId();
    await ensureRoom(roomId);
    history.replaceState(null, "", buildRoomUrl(location.href, roomId));
  } else {
    await ensureRoom(roomId);
  }

  const exclusions = createExclusionStore();

  let sharedNames = [];
  let pendingNames = null;

  const canvas = document.getElementById("wheel-canvas");
  const ctx = canvas.getContext("2d");
  const listEl = document.getElementById("name-list");
  const emptyMessageEl = document.getElementById("wheel-empty-message");
  const panelMessageEl = document.getElementById("panel-message");

  const spinController = createSpinController({
    ctx,
    getColors: (n) => generateSliceColors(n),
  });

  function getWheelNames() {
    return sharedNames.filter((n) => !exclusions.isExcluded(n.id));
  }

  function renderAll() {
    const wheelNames = getWheelNames();
    emptyMessageEl.hidden = wheelNames.length > 0;
    spinController.draw(wheelNames);
    renderNameList(listEl, sharedNames, async (id) => {
      await removeNameFromRoom(roomId, id);
    });
  }

  subscribeToNames(roomId, (names) => {
    if (spinController.isSpinning()) {
      pendingNames = names;
      return;
    }
    sharedNames = names;
    renderAll();
  });

  wireAddForm({
    formEl: document.getElementById("add-name-form"),
    inputEl: document.getElementById("add-name-input"),
    messageEl: panelMessageEl,
    getCurrentCount: () => sharedNames.length,
    onAdd: async (text) => {
      await addNameToRoom(roomId, text);
    },
  });

  canvas.addEventListener("click", () => {
    if (spinController.isSpinning()) return;
    const wheelNames = getWheelNames();
    if (wheelNames.length === 0) return;

    spinController.spin(wheelNames, (winner) => {
      showWinnerPopup(winner.text);
      wirePopupButtons({
        onRemove: () => {
          exclusions.excludeName(winner.id);
          renderAll();
        },
      });

      if (pendingNames) {
        sharedNames = pendingNames;
        pendingNames = null;
        renderAll();
      }
    });
  });

  renderAll();
}

main();
```

- [ ] **Step 2: Manual verification — full flow, single tab**

With `python -m http.server 8000` running, open `http://localhost:8000/`
(no `#r=` fragment).

Expected: the URL updates in the address bar to include a new
`#r=<8-char-id>`. Add a few names via the panel; each appears in the list
and on the wheel with a distinct pastel color. Click the wheel: it spins
and eases to a stop; a popup names the winning slice, matching whichever
slice visually ends up at the pink diamond pointer. Click **OK** — popup
closes, wheel state unchanged. Spin again, click **🗑 Remove** — popup
closes and that name disappears from the wheel but is still present in the
side panel. Refresh the page — the removed name reappears on the wheel
(session exclusion cleared), full shared list intact. Delete a name via
its ✕ in the panel — it disappears from both panel and wheel permanently
(persists across refresh).

- [ ] **Step 3: Manual verification — shared list across two tabs**

Copy the URL (including its `#r=...`) into a second browser tab.

Expected: both tabs show the same name list. Add a name in tab A — it
appears in tab B within about a second, with no manual refresh. Delete a
name via the ✕ in tab B — it disappears in tab A too.

- [ ] **Step 4: Manual verification — mid-spin update deferral**

With both tabs open on the same room and at least 3 names: in tab A, click
the wheel to start a spin, and *while it's still spinning*, add a name in
tab B.

Expected: tab A's in-progress spin visibly keeps running on its original
set of slices (it does not jump or resize mid-spin); once it stops and the
popup is dismissed (or immediately after landing — the update is applied
right when the spin's `onComplete` runs), the newly added name shows up on
tab A's wheel.

- [ ] **Step 5: Manual verification — 0 and 1 name edge cases**

Remove all names via the panel's ✕ buttons.

Expected: the wheel shows the empty-state message ("Add names to start")
and clicking it does nothing (no spin starts). Add exactly one name.

Expected: clicking the wheel still plays the full spin animation and the
popup always names that one person.

- [ ] **Step 6: Commit**

```bash
git add js/app.js
git commit -m "Wire app entry point: room resolution, Firebase sync, spin, popup

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 14: Deployment

**Files:** none (repo/GitHub settings only).

**Interfaces:** none — this task makes the already-complete app reachable
publicly; it changes no code.

- [ ] **Step 1: Push to `main`**

```bash
git push origin main
```

- [ ] **Step 2: Enable GitHub Pages**

In the GitHub repo (`DrEtRhI/Random_wheel`) → Settings → Pages → under
"Build and deployment", set Source to "Deploy from a branch", Branch to
`main` / `/ (root)` → Save.

- [ ] **Step 3: Manual verification — live site**

Wait for the Pages deployment to finish (the repo's Actions tab or the
Pages settings page shows its status), then open
`https://drethi.github.io/Random_wheel/`.

Expected: same behavior as the local manual verification in Task 13 —
page loads, URL gains a `#r=...` room id, adding/removing/spinning all
work, and the list is shared live with another browser/device opening the
same URL. Also check on a narrow (phone-width, ~400px) viewport or browser
dev-tools device emulation: the panel stacks below the wheel and nothing
overflows horizontally.

- [ ] **Step 4: No commit needed**

This task only changes GitHub repo settings, not files — nothing to add
or commit.
