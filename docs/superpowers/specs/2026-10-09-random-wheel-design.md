# Random Wheel — Design Spec

Date: 2026-10-09
Status: Approved for implementation

## 1. Purpose

A web page that displays a spinnable "wheel of names" (one colored slice per
name). Clicking the wheel spins it; it lands on one name, shown in a winner
popup. The name list is shared: anyone opening the same URL sees and can
modify the same list, live.

Target host: GitHub Pages, repo `DrEtRhI/Random_wheel` →
`https://drethi.github.io/Random_wheel/`.

## 2. Architecture

### 2.1 Hosting & stack

Static site, no build step: plain HTML/CSS/JS at the repo root (`index.html`
+ assets), deployed via GitHub Pages from `main` / root. Two external
libraries loaded from CDN:

- Firebase JS SDK (Realtime Database + App) — shared state.
- html2canvas — render the winner popup to an image for clipboard copy.

### 2.2 Shared state — Firebase Realtime Database

One Firebase project (already created by the user: `random-wheel-c0365`,
region `europe-west1`). Web config is public-safe (security is enforced by
DB rules, not by hiding the API key) and committed directly into the repo's
JS.

**Rooms.** Each independent name-list is a "room" keyed by a short random
id, carried in the URL fragment: `https://drethi.github.io/Random_wheel/#r=<roomId>`.

- Opening the bare URL (no `#r=`) generates a new room id (8 random
  base36 chars), writes `{ names: {} }` to
  `/rooms/<roomId>`, and rewrites the URL in place (`history.replaceState`)
  so the address bar now shows the shareable link.
- Opening a URL with `#r=<roomId>` subscribes to that room's data via
  Firebase's realtime `on('value', ...)` — every tab with the same URL stays
  in sync live, no polling.
- Data shape: `/rooms/<roomId>/names/<nameId> = { text: "Alice" }`. Each
  name gets a generated id (`push()` key) so list order/identity survives
  concurrent edits from different people.

**Session-only exclusions.** The popup's "Remove" button removes a name
from the *wheel* for the current browser session only (kept in a JS
`Set`/`sessionStorage`, never written to Firebase). It does **not** touch
the shared list. A page refresh reloads the full shared list from Firebase
and clears all session exclusions. The only way to permanently delete a
name from the shared list is the ✕ in the side panel, which does write to
Firebase (and thus affects everyone).

### 2.3 Quotas — staying inside the Firebase Spark (free) plan

Hard limits, enforced in two layers:

- **Client-side** (UX): name input has `maxlength=40`; once a room holds 50
  names, the Add control disables with a "List full (50 max)" message.
- **Firebase Realtime Database rules** (the real backstop — the only layer
  a modified/malicious client can't bypass):
  - Reject any write to `/rooms/<roomId>/names` that would bring the child
    count above 50.
  - Reject any name whose `text` exceeds 40 characters.
  - Room ids are fixed-format 8-char base36 strings; no arbitrary-depth
    writes allowed outside `/rooms/<roomId>/names/<nameId>/text`.
- At this ceiling a room's JSON is a few KB; well within the Spark plan's
  1GB stored / 10GB served per month even with many rooms and frequent
  live updates.

Example rules (final values to be written into the Firebase console as part
of implementation):

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        "names": {
          ".write": "(!data.exists() || data.numChildren() < 50) && newData.numChildren() <= 50",
          "$nameId": {
            ".validate": "newData.hasChild('text') && newData.child('text').isString() && newData.child('text').val().length <= 40"
          }
        }
      }
    },
    "$other": { ".read": false, ".write": false }
  }
}
```

(Exact rule syntax will be verified against Firebase's rule language during
implementation — the intent above — read open, write capped by count and
per-name length — is the contract.)

## 3. Page layout

Based on `Display_example.svg`:

- **Left: the wheel.** Circular, divided into N equal slices (one per
  name), each slice colored per §5 and labeled with the name along its
  radius. A red diamond pointer is fixed at the wheel's left edge (9
  o'clock), pointing inward — the slice facing it when the wheel stops is
  the winner.
- **Right: name panel.** A list of current (shared) names, each row with a
  ✕ button that permanently deletes that name (writes to Firebase). Below
  the list: a text input (`maxlength=40`) + "Add" button, Enter key also
  submits. Disabled/blocked at the 50-name cap (§2.3).
- **Responsive:** panel stacks below the wheel under ~700px width; wheel
  scales to fit viewport width.
- **Edge cases:**
  - 0 names: wheel shows a placeholder state ("Add names to start"), click-
    to-spin disabled.
  - 1 name: spin animation still plays (for consistency/fun) and always
    "lands" on that one name.
  - Duplicate names: allowed (no uniqueness constraint) — each is a
    distinct entry with its own id and gets its own slice/color.

## 4. Spin mechanic & winner popup

- Clicking the wheel while idle starts a spin: fast initial angular
  velocity, multiple full rotations, cubic ease-out to a stop over roughly
  4 seconds. Total rotation is randomized so the stopping slice is
  effectively uniformly random among names currently on the wheel (shared
  list minus this session's exclusions).
- While spinning, further clicks on the wheel are ignored until it stops.
- If the shared list changes (another user adds/removes a name) while a
  spin is in progress, the in-progress spin finishes against the slice
  layout it started with; the live update is applied right after the spin
  completes (and before the next spin). This avoids slices shifting under
  a wheel that's already in motion.
- On stop, a popup appears showing the winning name, with three buttons:
  - **OK** — closes the popup. No state change.
  - **📷 Copy image** — renders the popup via html2canvas to a PNG and
    writes it to the clipboard via the Clipboard API, so it can be pasted
    (e.g. into a chat app) to announce the result.
  - **🗑 Remove** — adds the name to this session's wheel-exclusion set
    (§2.2) and closes the popup. The name disappears from the wheel (but
    stays in the shared side panel) until the page is refreshed.

## 5. Color assignment

Goal: every slice gets a visually distinct pastel color, and colors that
are *physically adjacent* on the wheel (including the wrap between the
last and first slice) stay clearly distinguishable from each other.

Algorithm, recomputed whenever the list size (N) changes:

1. Generate N hues evenly spaced around the hue circle (`360/N` apart), at
   a fixed OKLCH lightness/chroma chosen to:
   - sit in a pastel-but-not-washed-out band (chroma above the "reads as
     gray" floor),
   - keep adequate contrast against the white page background and against
     the dark label text drawn on each slice (matching the dark
     `#1e1e1e`-style text in the example SVG).
2. Assign those N hues to the N physical slice positions using a circular
   max-min-separation ordering (greedy farthest-placement with local 2-opt
   refinement) rather than sequential order — this maximizes the smallest
   hue gap between any two physically neighboring slices, wraparound
   included. (Verified by hand-computation during design: for the fixed
   lightness/chroma chosen, achievable worst-case adjacent-hue separations
   of 120°+ translate to large OKLab color differences, comfortably clear
   of standard colorblind-safe separation thresholds for realistic list
   sizes.)
3. Colors are derived purely from N (count), not from name identity, and
   recompute whenever names are added/removed — so colors are not stable
   per-person across edits, only distinct-at-a-glance at any given moment.

## 6. Out of scope / explicitly deferred

- No user accounts/auth — anyone with a room URL can read and edit that
  room (same trust model as "anyone with the link can edit").
- No history/audit log of past spins.
- No cross-room list (one room = one independent wheel/list).
- No offline support — requires network access to Firebase.
- No automatic room cleanup/expiry — rooms persist indefinitely. Not a
  practical storage concern at the enforced per-room caps (§2.3), but
  worth knowing if this sees heavy long-term use.
