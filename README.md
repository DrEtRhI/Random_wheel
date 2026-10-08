# Random Wheel

A shareable "wheel of names" picker. Add names in the side panel, click the
wheel to spin, and get a random winner. The name list is stored in Firebase
and shared live with anyone who opens the same URL.

## Run locally

No build step. From the repo root:

```
python -m http.server 8000
```

Then open http://localhost:8000/ in a browser.

## Run tests

Unit tests cover the pure logic modules (room ids, name validation, color
assignment, spin/winner geometry, session exclusions) and run with
[Bun](https://bun.sh):

```
bun test
```

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
