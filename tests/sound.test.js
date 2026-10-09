import { describe, test, expect } from "bun:test";
import { unlockAudio, playTick, playWin } from "../js/sound.js";

// There is no AudioContext in bun's runtime (no browser). These tests
// confirm the module degrades gracefully (no throw, no-op) rather than
// testing actual audio output, which needs a real browser.

describe("sound (no AudioContext available)", () => {
  test("unlockAudio does not throw", () => {
    expect(() => unlockAudio()).not.toThrow();
  });

  test("playTick does not throw", () => {
    expect(() => playTick()).not.toThrow();
  });

  test("playWin does not throw", () => {
    expect(() => playWin()).not.toThrow();
  });
});

describe("sound (fake AudioContext present)", () => {
  function makeFakeAudioContext() {
    const createdOscillators = [];
    class FakeGain {
      constructor() {
        this.gain = {
          values: [],
          setValueAtTime(v, t) {
            this.values.push(["set", v, t]);
          },
          linearRampToValueAtTime(v, t) {
            this.values.push(["linear", v, t]);
          },
          exponentialRampToValueAtTime(v, t) {
            this.values.push(["exp", v, t]);
          },
        };
      }
      connect() {}
    }
    class FakeOscillator {
      constructor() {
        this.type = null;
        this.frequency = { value: 0 };
        this.started = null;
        this.stopped = null;
      }
      connect() {}
      start(t) {
        this.started = t;
      }
      stop(t) {
        this.stopped = t;
      }
    }
    return {
      state: "running",
      currentTime: 0,
      destination: {},
      createGain() {
        return new FakeGain();
      },
      createOscillator() {
        const osc = new FakeOscillator();
        createdOscillators.push(osc);
        return osc;
      },
      resume: async () => {},
      _createdOscillators: createdOscillators,
    };
  }

  // sound.js caches a single AudioContext instance at module scope (as the
  // real browser usage does — you don't want a new context per sound), so
  // both assertions run against the same fake context in one test rather
  // than swapping global.AudioContext mid-file.
  test("playTick starts one oscillator, playWin starts a 4-note chord", () => {
    const fakeCtx = makeFakeAudioContext();
    global.AudioContext = function () {
      return fakeCtx;
    };

    playTick();
    expect(fakeCtx._createdOscillators).toHaveLength(1);
    expect(fakeCtx._createdOscillators[0].started).not.toBeNull();

    playWin();
    expect(fakeCtx._createdOscillators).toHaveLength(5); // 1 tick + 4 chord notes

    delete global.AudioContext;
  });
});
