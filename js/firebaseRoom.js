import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  remove,
  onValue,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { SPIN_DURATION_MS } from "./spin.js";

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

function spinRefFor(roomId) {
  return ref(db, `rooms/${roomId}/spin`);
}

let serverTimeOffset = 0;
onValue(ref(db, ".info/serverTimeOffset"), (snapshot) => {
  serverTimeOffset = snapshot.val() || 0;
});

export function getServerNow() {
  return Date.now() + serverTimeOffset;
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
    const names = Object.entries(val)
      .filter(([, data]) => data && typeof data.text === "string")
      .map(([id, data]) => ({
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

export async function startSpin(roomId, { startRotation, targetRotation, names }) {
  const spinRef = spinRefFor(roomId);
  const result = await runTransaction(spinRef, (current) => {
    const now = getServerNow();
    if (current && now - current.startedAt < SPIN_DURATION_MS) {
      return; // abort: a spin is already in progress for this room
    }
    return { startedAt: now, startRotation, targetRotation, names };
  });
  return result.committed;
}

export function subscribeToSpin(roomId, callback) {
  const spinRef = spinRefFor(roomId);
  return onValue(spinRef, (snapshot) => {
    callback(snapshot.val());
  });
}
