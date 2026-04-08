import { afterEach, describe, expect, it, vi } from "vitest";
import { startAppViewTransition } from "./viewTransition";

type DeferredTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
  resolve: () => void;
  reject: (reason?: unknown) => void;
};

function createDeferredTransition(): DeferredTransition {
  let resolve = () => {};
  let reject = (_reason?: unknown) => {};
  const finished = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    ready: Promise.resolve(),
    finished,
    updateCallbackDone: Promise.resolve(),
    skipTransition: () => {},
    resolve,
    reject,
  };
}

function stubReducedMotion(matches: boolean) {
  const matchMedia = vi.fn().mockReturnValue({
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("matchMedia", matchMedia);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: matchMedia,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "startViewTransition");
  document.documentElement.removeAttribute("data-vt-type");
});

describe("startAppViewTransition", () => {
  it("runs the update callback synchronously when the API is missing", () => {
    // jsdom has no startViewTransition — ensure we still get the mutation.
    const update = vi.fn();

    startAppViewTransition(update, "mode-switch");

    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.vtType).toBeUndefined();
  });

  it("runs the update synchronously when reduced motion is preferred", () => {
    stubReducedMotion(true);
    const startViewTransition = vi.fn();
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      writable: true,
      value: startViewTransition,
    });

    const update = vi.fn();
    startAppViewTransition(update, "mode-switch");

    expect(update).toHaveBeenCalledTimes(1);
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.vtType).toBeUndefined();
  });

  it("invokes document.startViewTransition and tags the root with the type", async () => {
    stubReducedMotion(false);
    const deferred = createDeferredTransition();
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return deferred;
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      writable: true,
      value: startViewTransition,
    });

    const update = vi.fn();
    startAppViewTransition(update, "nav-forward");

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.vtType).toBe("nav-forward");

    deferred.resolve();
    await deferred.finished;
    // Let the .then() microtask flush.
    await Promise.resolve();

    expect(document.documentElement.dataset.vtType).toBeUndefined();
  });

  it("clears the type attribute even if the transition rejects", async () => {
    stubReducedMotion(false);
    const deferred = createDeferredTransition();
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return deferred;
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      writable: true,
      value: startViewTransition,
    });

    startAppViewTransition(() => {}, "overlay-exit");
    expect(document.documentElement.dataset.vtType).toBe("overlay-exit");

    deferred.reject(new Error("aborted"));
    // The helper swallows the rejection via then(cleanup, cleanup); wait for
    // the microtask queue to flush so cleanup runs before we assert.
    await deferred.finished.catch(() => {});
    await Promise.resolve();

    expect(document.documentElement.dataset.vtType).toBeUndefined();
  });

  it("omits the type attribute when no type is supplied", async () => {
    stubReducedMotion(false);
    const deferred = createDeferredTransition();
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return deferred;
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      writable: true,
      value: startViewTransition,
    });

    const update = vi.fn();
    startAppViewTransition(update);

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.vtType).toBeUndefined();

    deferred.resolve();
    await deferred.finished;
    await Promise.resolve();

    expect(document.documentElement.dataset.vtType).toBeUndefined();
  });
});
