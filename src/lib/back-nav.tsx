import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Android/browser Back support for the in-app screen stack.
 *
 * The app renders screens from React state rather than routes, so we mirror
 * every screen change into the browser history. The Android system Back
 * gesture then fires `popstate`, which we translate back into a screen pop.
 * Modals/overlays register themselves on a LIFO stack so Back closes the
 * top-most overlay first and only then navigates back a screen.
 */

type ModalEntry = { close: () => void; popped: boolean };

const modalStack: ModalEntry[] = [];
let suppressPops = 0;

const isBrowser = typeof window !== "undefined";

export function useScreenStack<T>(initial: T) {
  const [stack, setStack] = useState<T[]>([initial]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  useEffect(() => {
    if (!isBrowser) return;
    // Mark the entry point as depth 0 so we can compute how far Back went.
    window.history.replaceState({ ...(window.history.state ?? {}), appDepth: 0 }, "");

    const onPop = (e: PopStateEvent) => {
      if (suppressPops > 0) {
        suppressPops--;
        return;
      }
      const top = modalStack.pop();
      if (top) {
        top.popped = true;
        top.close();
        return;
      }
      const state = e.state as { appDepth?: number } | null;
      const depth = typeof state?.appDepth === "number" ? state.appDepth : 0;
      setStack((prev) => prev.slice(0, Math.max(1, depth + 1)));
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const push = useCallback((screen: T) => {
    const depth = stackRef.current.length;
    if (isBrowser) window.history.pushState({ appDepth: depth }, "");
    setStack((prev) => [...prev, screen]);
  }, []);

  const reset = useCallback((screen: T) => {
    const back = stackRef.current.length - 1;
    setStack([screen]);
    if (isBrowser && back > 0) {
      suppressPops += back;
      window.history.go(-back);
    }
  }, []);

  return { screen: stack[stack.length - 1]!, depth: stack.length, push, reset };
}

/**
 * While `open` is true an extra history entry exists for the overlay, so the
 * Android Back gesture closes the overlay instead of leaving the page.
 * Closing via on-screen controls removes that entry again.
 */
export function useBackClose(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open || !isBrowser) return;
    const entry: ModalEntry = { popped: false, close: () => closeRef.current() };
    modalStack.push(entry);
    window.history.pushState({ appModal: true }, "");

    return () => {
      const i = modalStack.indexOf(entry);
      if (i >= 0) modalStack.splice(i, 1);
      if (!entry.popped) {
        suppressPops++;
        window.history.back();
      }
    };
  }, [open]);
}
