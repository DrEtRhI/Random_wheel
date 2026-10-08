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
