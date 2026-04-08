/**
 * Thin wrapper around the native View Transitions API with graceful fallback.
 *
 * Runs the supplied mutation inside `document.startViewTransition` when
 * available, so the browser can snapshot the page before the update and
 * animate to the new state. Falls back to running the mutation synchronously
 * when the API isn't implemented, the caller requested reduced motion, or
 * we're in a non-DOM environment like jsdom (tests).
 *
 * A `type` can be supplied to drive directional/contextual animations via
 * CSS: while the transition is running, the type is attached as
 * `data-vt-type="..."` on the `<html>` element so pseudo-element rules like
 * `:root[data-vt-type="nav-forward"] ::view-transition-new(main-content)`
 * can pick the right animation.
 */

type StartViewTransition = (
  cb: () => void | Promise<void>
) => {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
};

export type AppViewTransitionType =
  | "mode-switch"
  | "nav-forward"
  | "nav-back"
  | "overlay-enter"
  | "overlay-exit"
  | "section-change"
  | "panel-toggle"
  | "toast-dismiss";

function hasDocument(): boolean {
  return typeof document !== "undefined";
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function getStartViewTransition(): StartViewTransition | null {
  if (!hasDocument()) {
    return null;
  }
  const candidate = (
    document as Document & {
      startViewTransition?: StartViewTransition;
    }
  ).startViewTransition;
  return typeof candidate === "function" ? candidate.bind(document) : null;
}

/**
 * Runs `update` inside a view transition if the browser supports it, marking
 * the root element with `data-vt-type` while the animation is in flight.
 *
 * If the browser lacks support, or the user prefers reduced motion, `update`
 * runs synchronously and no type is attached.
 */
export function startAppViewTransition(
  update: () => void,
  type?: AppViewTransitionType
): void {
  const start = getStartViewTransition();

  if (!start || prefersReducedMotion()) {
    update();
    return;
  }

  const root = document.documentElement;
  if (type) {
    root.dataset.vtType = type;
  }

  const transition = start(() => {
    update();
  });

  const cleanup = () => {
    if (type && root.dataset.vtType === type) {
      delete root.dataset.vtType;
    }
  };

  transition.finished.then(cleanup, cleanup);
}
