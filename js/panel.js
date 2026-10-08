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
