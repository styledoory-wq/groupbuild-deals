import { useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Hidden admin entry: 5 quick taps OR 3-second long press.
 * Returns handlers to spread on a logo / brand element.
 */
export function useHiddenAdminGesture() {
  const navigate = useNavigate();
  const tapsRef = useRef<number[]>([]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredByLongPress = useRef(false);

  const trigger = useCallback(() => {
    navigate("/admin/login");
  }, [navigate]);

  const handleTap = useCallback(() => {
    if (triggeredByLongPress.current) {
      triggeredByLongPress.current = false;
      return;
    }
    const now = Date.now();
    // keep taps within 2s window
    tapsRef.current = [...tapsRef.current.filter((t) => now - t < 2000), now];
    if (tapsRef.current.length >= 5) {
      tapsRef.current = [];
      trigger();
    }
  }, [trigger]);

  const startLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      triggeredByLongPress.current = true;
      trigger();
    }, 3000);
  }, [trigger]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return {
    onClick: handleTap,
    onMouseDown: startLongPress,
    onMouseUp: cancelLongPress,
    onMouseLeave: cancelLongPress,
    onTouchStart: startLongPress,
    onTouchEnd: cancelLongPress,
    onTouchCancel: cancelLongPress,
  };
}
