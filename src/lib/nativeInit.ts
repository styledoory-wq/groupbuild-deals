import { Capacitor } from "@capacitor/core";

/**
 * Native-only initialization for iOS / Android (Capacitor).
 *
 * - Hides the iOS keyboard accessory bar.
 * - Tracks keyboard height in a CSS var (--kb-h) so layout can react.
 * - Adds a `keyboard-open` class to <html> when the keyboard is visible
 *   (used to hide the floating BottomNav so it doesn't cover form inputs).
 * - Scrolls the focused input into view smoothly when the keyboard opens.
 */
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { Keyboard } = await import("@capacitor/keyboard");

    // Remove the "Done / arrows" accessory bar on iOS for a cleaner look.
    if (Capacitor.getPlatform() === "ios") {
      try {
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
      } catch {
        /* ignore */
      }
    }

    Keyboard.addListener("keyboardWillShow", (info) => {
      document.documentElement.style.setProperty("--kb-h", `${info.keyboardHeight}px`);
      document.documentElement.classList.add("keyboard-open");
    });

    Keyboard.addListener("keyboardDidShow", () => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        // Defer one frame so the webview has finished resizing.
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
    });

    Keyboard.addListener("keyboardWillHide", () => {
      document.documentElement.style.setProperty("--kb-h", "0px");
      document.documentElement.classList.remove("keyboard-open");
    });
  } catch {
    /* plugin not available — web build, ignore */
  }
}
