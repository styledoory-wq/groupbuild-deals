/**
 * Compact hero brand lockup — mark + wordmark + tagline.
 * RTL: mark sits at the outer (right) edge, text to its left.
 * White mark + wordmark for contrast on dark hero photography.
 */
export function HeroBrandLockup() {
  return (
    <div
      className="flex items-center gap-2.5 shrink-0 min-w-0"
      style={{ filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.45))" }}
      aria-label="GroupBuild"
      role="img"
    >
      <img
        src="/brand/groupbuild-mark.png"
        alt=""
        aria-hidden
        className="h-9 w-auto sm:h-10 object-contain select-none shrink-0"
        style={{ filter: "brightness(0) invert(1)" }}
        draggable={false}
      />
      <div className="text-right leading-tight min-w-0">
        <p
          className="text-[15px] sm:text-[16px] font-extrabold text-white tracking-tight"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}
        >
          GroupBuild
        </p>
        <p
          className="text-[11px] sm:text-[12px] font-semibold text-white/90"
          style={{ textShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
        >
          בונים טוב יותר. יחד.
        </p>
      </div>
    </div>
  );
}
