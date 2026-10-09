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
import { MAX_NAMES } from "./validation.js";
import { unlockAudio, playTick, playWin } from "./sound.js";

const colorCache = new Map();
function getColorsForCount(n) {
  if (!colorCache.has(n)) {
    colorCache.set(n, generateSliceColors(n));
  }
  return colorCache.get(n);
}

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
  const resetWheelButtonEl = document.getElementById("reset-wheel-button");
  const addNameInputEl = document.getElementById("add-name-input");
  const addNameButtonEl = document.getElementById("add-name-button");

  const spinController = createSpinController({
    ctx,
    getColors: getColorsForCount,
    onTick: playTick,
  });

  resetWheelButtonEl.addEventListener("click", () => {
    exclusions.clearExclusions();
    renderAll();
  });

  function getWheelNames() {
    return sharedNames.filter((n) => !exclusions.isExcluded(n.id));
  }

  function renderAll() {
    const wheelNames = getWheelNames();
    const allExcluded = sharedNames.length > 0 && wheelNames.length === 0;

    emptyMessageEl.hidden = wheelNames.length > 0;
    emptyMessageEl.textContent = allExcluded
      ? "All names removed for this session."
      : "Add names to start";
    resetWheelButtonEl.hidden = !allExcluded;

    spinController.draw(wheelNames);
    renderNameList(listEl, sharedNames, async (id) => {
      try {
        await removeNameFromRoom(roomId, id);
      } catch (err) {
        console.error("Failed to remove name:", err);
      }
    });

    if (sharedNames.length >= MAX_NAMES) {
      addNameInputEl.disabled = true;
      addNameButtonEl.disabled = true;
      panelMessageEl.textContent = "List full (50 max).";
    } else {
      addNameInputEl.disabled = false;
      addNameButtonEl.disabled = false;
      if (panelMessageEl.textContent === "List full (50 max).") {
        panelMessageEl.textContent = "";
      }
    }
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
    getExistingTexts: () => sharedNames.map((n) => n.text),
    onAdd: async (text) => {
      try {
        await addNameToRoom(roomId, text);
      } catch (err) {
        console.error("Failed to add name:", err);
        panelMessageEl.textContent = "Couldn't add name — try again.";
      }
    },
  });

  canvas.addEventListener("click", () => {
    if (spinController.isSpinning()) return;
    const wheelNames = getWheelNames();
    if (wheelNames.length === 0) return;

    unlockAudio();
    spinController.spin(wheelNames, (winner) => {
      playWin();
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

main().catch((err) => {
  console.error(err);
  document.getElementById("panel-message").textContent =
    "Couldn't connect to the shared list. Check your connection and reload.";
});
