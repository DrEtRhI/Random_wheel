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
