import { describe, test, expect, beforeEach } from "bun:test";
import { showWinnerPopup, hideWinnerPopup, wirePopupButtons } from "../js/popup.js";

function makeFakeButton() {
  const listeners = {};
  return {
    textContent: "",
    onclick: null,
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      listeners[type] = (listeners[type] || []).filter((h) => h !== handler);
    },
    click() {
      if (this.onclick) this.onclick();
      for (const handler of listeners.click || []) handler();
    },
  };
}

let elements;

beforeEach(() => {
  elements = {
    "winner-name": { textContent: "" },
    "winner-popup": { hidden: true },
    "winner-popup-content": {},
    "winner-ok-button": makeFakeButton(),
    "winner-copy-button": makeFakeButton(),
    "winner-remove-button": makeFakeButton(),
  };
  global.document = {
    getElementById: (id) => elements[id],
  };
});

describe("showWinnerPopup / hideWinnerPopup", () => {
  test("showWinnerPopup sets the name text and un-hides the popup", () => {
    showWinnerPopup("Alice");
    expect(elements["winner-name"].textContent).toBe("Alice");
    expect(elements["winner-popup"].hidden).toBe(false);
  });

  test("hideWinnerPopup re-hides the popup", () => {
    showWinnerPopup("Alice");
    hideWinnerPopup();
    expect(elements["winner-popup"].hidden).toBe(true);
  });
});

describe("wirePopupButtons", () => {
  test("OK button hides the popup", () => {
    showWinnerPopup("Alice");
    wirePopupButtons({ onRemove: () => {} });

    elements["winner-ok-button"].click();

    expect(elements["winner-popup"].hidden).toBe(true);
  });

  test("Remove button fires onRemove once and hides the popup", () => {
    showWinnerPopup("Alice");
    let removeCount = 0;
    wirePopupButtons({ onRemove: () => removeCount++ });

    elements["winner-remove-button"].click();

    expect(removeCount).toBe(1);
    expect(elements["winner-popup"].hidden).toBe(true);
  });

  test("wiring a second time (e.g. for the next spin) does not double-fire the remove handler", () => {
    showWinnerPopup("Alice");
    let removeCountA = 0;
    wirePopupButtons({ onRemove: () => removeCountA++ });

    let removeCountB = 0;
    wirePopupButtons({ onRemove: () => removeCountB++ });

    elements["winner-remove-button"].click();

    expect(removeCountA).toBe(0);
    expect(removeCountB).toBe(1);
  });

  test("copy button flashes 'Copied!' on success", async () => {
    showWinnerPopup("Alice");
    global.html2canvas = async () => ({ toBlob: (cb) => cb({ fakeBlob: true }) });
    global.ClipboardItem = function (data) {
      this.data = data;
    };
    global.navigator = { clipboard: { write: async () => {} } };

    const copyButton = elements["winner-copy-button"];
    copyButton.textContent = "📷 Copy image";
    wirePopupButtons({ onRemove: () => {} });

    await copyButton.onclick();

    expect(copyButton.textContent).toBe("Copied!");
  });

  test("copy button flashes 'Copy failed' when the clipboard write rejects", async () => {
    showWinnerPopup("Alice");
    global.html2canvas = async () => ({ toBlob: (cb) => cb({ fakeBlob: true }) });
    global.ClipboardItem = function (data) {
      this.data = data;
    };
    global.navigator = {
      clipboard: {
        write: async () => {
          throw new Error("denied");
        },
      },
    };

    const copyButton = elements["winner-copy-button"];
    copyButton.textContent = "📷 Copy image";
    wirePopupButtons({ onRemove: () => {} });

    await copyButton.onclick();

    expect(copyButton.textContent).toBe("Copy failed");
  });
});
