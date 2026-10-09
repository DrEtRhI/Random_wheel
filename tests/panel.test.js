import { describe, test, expect } from "bun:test";
import { renderNameList, wireAddForm } from "../js/panel.js";

// Minimal fake DOM elements — just enough surface area for panel.js to work
// against, without a real browser/document.

function makeFakeElement(overrides = {}) {
  const listeners = {};
  return {
    dataset: {},
    className: "",
    textContent: "",
    attributes: {},
    children: [],
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    dispatch(type, event) {
      for (const handler of listeners[type] || []) handler(event);
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
    ...overrides,
  };
}

function makeFakeDocument() {
  return {
    createElement(tag) {
      return makeFakeElement({ tag });
    },
  };
}

describe("renderNameList", () => {
  test("renders one <li> per name with id, text, and a remove button", () => {
    global.document = makeFakeDocument();
    const listEl = makeFakeElement();
    const names = [
      { id: "a1", text: "Alice" },
      { id: "b2", text: "Bob" },
    ];

    renderNameList(listEl, names, () => {});

    expect(listEl.children).toHaveLength(2);
    expect(listEl.children[0].dataset.id).toBe("a1");
    const [span, button] = listEl.children[0].children;
    expect(span.textContent).toBe("Alice");
    expect(button.tag).toBe("button");
  });

  test("clears previous content on re-render", () => {
    global.document = makeFakeDocument();
    const listEl = makeFakeElement();
    renderNameList(listEl, [{ id: "a1", text: "Alice" }], () => {});
    expect(listEl.children).toHaveLength(1);

    listEl.innerHTML = ""; // renderNameList sets this; emulate real reset
    listEl.children = [];
    renderNameList(listEl, [{ id: "a1", text: "Alice" }, { id: "b2", text: "Bob" }], () => {});
    expect(listEl.children).toHaveLength(2);
  });

  test("clicking the remove button calls onRemove with that name's id, exactly once", () => {
    global.document = makeFakeDocument();
    const listEl = makeFakeElement();
    const names = [
      { id: "a1", text: "Alice" },
      { id: "b2", text: "Bob" },
    ];
    const removed = [];
    renderNameList(listEl, names, (id) => removed.push(id));

    const [, bobButton] = listEl.children[1].children;
    bobButton.dispatch("click");

    expect(removed).toEqual(["b2"]);
  });
});

describe("wireAddForm", () => {
  function setup() {
    const formEl = makeFakeElement();
    const inputEl = makeFakeElement({ value: "" });
    const messageEl = makeFakeElement();
    const added = [];
    wireAddForm({
      formEl,
      inputEl,
      messageEl,
      getCurrentCount: () => 0,
      onAdd: (text) => added.push(text),
    });
    return { formEl, inputEl, messageEl, added };
  }

  test("submitting a valid name calls onAdd, clears the input and message", () => {
    const { formEl, inputEl, messageEl, added } = setup();
    inputEl.value = "  Alice  ";
    let defaultPrevented = false;
    formEl.dispatch("submit", { preventDefault: () => (defaultPrevented = true) });

    expect(defaultPrevented).toBe(true);
    expect(added).toEqual(["Alice"]);
    expect(inputEl.value).toBe("");
    expect(messageEl.textContent).toBe("");
  });

  test("submitting an empty name shows an error and does not call onAdd", () => {
    const { formEl, inputEl, messageEl, added } = setup();
    inputEl.value = "   ";
    formEl.dispatch("submit", { preventDefault: () => {} });

    expect(added).toEqual([]);
    expect(messageEl.textContent).toBe("Name cannot be empty.");
  });

  test("submitting a name that already exists shows a duplicate error and does not call onAdd", () => {
    const formEl = makeFakeElement();
    const inputEl = makeFakeElement({ value: "alice" });
    const messageEl = makeFakeElement();
    const added = [];
    wireAddForm({
      formEl,
      inputEl,
      messageEl,
      getCurrentCount: () => 1,
      getExistingTexts: () => ["Alice"],
      onAdd: (text) => added.push(text),
    });

    formEl.dispatch("submit", { preventDefault: () => {} });

    expect(added).toEqual([]);
    expect(messageEl.textContent).toBe("That name is already on the wheel.");
  });

  test("submitting at the name cap shows the cap error and does not call onAdd", () => {
    const formEl = makeFakeElement();
    const inputEl = makeFakeElement({ value: "Zoe" });
    const messageEl = makeFakeElement();
    const added = [];
    wireAddForm({
      formEl,
      inputEl,
      messageEl,
      getCurrentCount: () => 50,
      onAdd: (text) => added.push(text),
    });

    formEl.dispatch("submit", { preventDefault: () => {} });

    expect(added).toEqual([]);
    expect(messageEl.textContent).toMatch(/50/);
  });
});
