import { useMemo } from "react";

/**
 * Premium Dark — v3 Mockup
 * מבוסס ויזואלית על הרפרנסים שצורפו (מטבחים / שיפוצים / דלתות כניסה).
 *
 *  - תמונה דומיננטית (כל הקנבס) + Overlay כהה תחתון
 *  - מדליון הנחה צהוב גדול בצד
 *  - כותרת על התמונה + שורה צהובה דקה ("במחיר קבוצתי!")
 *  - בלוק תחתון: מחיר רגיל קטן ומחוק | המחיר בקבוצה - ענק, צהוב
 *  - QR קטן ומשולב בפינה
 *  - CTA כפסקה דקה במקום כפתור מערכת
 */

const SAMPLE = {
  category: "מטבחים",
  title: "מטבח חדש",
  tagline: "במחיר קבוצתי!",
  bullets: "איכות גבוהה · אחריות מלאה · התקנה מקצועית",
  regularPrice: 28000,
  groupPrice: 16900,
  ctaSmall: "כל שיותר מצטרפים, המחיר יורד!",
  ctaMain: "להצטרפות לחץ כאן",
  image:
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1600&q=80",
  qr: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Fgroupbuild.co.il%2Fd%2Fdemo&margin=0",
};

function PremiumDarkV3() {
  const discount = useMemo(
    () => Math.round((1 - SAMPLE.groupPrice / SAMPLE.regularPrice) * 100),
    []
  );
  const fmt = (n: number) => n.toLocaleString("he-IL");

  return (
    <div
      dir="rtl"
      style={{
        width: 1080,
        height: 1080,
        position: "relative",
        overflow: "hidden",
        fontFamily:
          "'Heebo', 'Rubik', system-ui, -apple-system, Segoe UI, sans-serif",
        background: "#0a0a0a",
        borderRadius: 28,
      }}
    >
      {/* === BACKGROUND IMAGE (full canvas) === */}
      <img
        src={SAMPLE.image}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "saturate(1.05) contrast(1.08) brightness(0.92)",
        }}
      />

      {/* Top vignette - keeps brand chip readable */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, height: 320,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* Bottom heavy gradient for the price block */}
      <div
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0, height: 560,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.95) 70%, #000 100%)",
        }}
      />

      {/* === TOP: Brand chip === */}
      <div
        style={{
          position: "absolute",
          top: 44, right: 44,
          display: "flex", alignItems: "center", gap: 12,
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.18)",
          padding: "12px 22px 12px 16px",
          borderRadius: 999,
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #FFD23F 0%, #E59A00 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#1a1a1a", fontWeight: 900, fontSize: 20,
          }}
        >
          G
        </div>
        <span
          style={{
            color: "#fff", fontWeight: 700, fontSize: 22, letterSpacing: -0.3,
          }}
        >
          GroupBuild
        </span>
      </div>

      {/* === TITLE block (top-right, on the image) === */}
      <div
        style={{
          position: "absolute",
          top: 170, right: 56,
          maxWidth: 620,
          color: "#fff",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 124,
            lineHeight: 0.95,
            fontWeight: 900,
            letterSpacing: -3,
            textShadow: "0 4px 24px rgba(0,0,0,0.55)",
          }}
        >
          {SAMPLE.title}
        </h1>
        <div
          style={{
            marginTop: 14,
            fontSize: 56,
            fontWeight: 900,
            color: "#FFC93C",
            letterSpacing: -1.2,
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
          }}
        >
          {SAMPLE.tagline}
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 22,
            fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {SAMPLE.bullets}
        </div>
      </div>

      {/* === DISCOUNT MEDALLION (left side, floating) === */}
      <div
        style={{
          position: "absolute",
          top: 470,
          insetInlineStart: 60,
          width: 230, height: 230,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 30% 30%, #FFE066 0%, #FFC93C 55%, #E59A00 100%)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          color: "#1a1a1a", fontWeight: 900,
          boxShadow:
            "0 24px 50px rgba(0,0,0,0.55), inset 0 -10px 18px rgba(0,0,0,0.12)",
          transform: "rotate(-10deg)",
          border: "4px solid rgba(255,255,255,0.6)",
        }}
      >
        <span style={{ fontSize: 28, lineHeight: 1, fontWeight: 800 }}>הנחה</span>
        <span style={{ fontSize: 96, lineHeight: 1, letterSpacing: -4, marginTop: 4 }}>
          {discount}%
        </span>
      </div>

      {/* === BOTTOM PRICE BLOCK === */}
      <div
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          padding: "0 60px 56px",
          color: "#fff",
        }}
      >
        {/* prices row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            marginBottom: 28,
          }}
        >
          {/* Regular price (small, struck) */}
          <div style={{ paddingBottom: 18 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "rgba(255,255,255,0.55)",
                marginBottom: 4,
              }}
            >
              מחיר רגיל
            </div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: "rgba(255,255,255,0.5)",
                textDecoration: "line-through",
                textDecorationThickness: 3,
                letterSpacing: -1,
              }}
            >
              ₪{fmt(SAMPLE.regularPrice)}
            </div>
          </div>

          {/* Group price (HERO) */}
          <div style={{ textAlign: "left", flexShrink: 0 }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#FFC93C",
                letterSpacing: 0.5,
                marginBottom: -6,
              }}
            >
              המחיר בקבוצה
            </div>
            <div
              style={{
                fontSize: 200,
                fontWeight: 900,
                color: "#FFC93C",
                letterSpacing: -8,
                lineHeight: 1,
                textShadow: "0 8px 30px rgba(255,201,60,0.35)",
              }}
            >
              ₪{fmt(SAMPLE.groupPrice)}
            </div>
          </div>
        </div>

        {/* CTA strip + QR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          {/* CTA (integrated to the creative, not system button) */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 22,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <span
                style={{
                  width: 8, height: 8, borderRadius: 999,
                  background: "#FFC93C",
                  boxShadow: "0 0 0 5px rgba(255,201,60,0.25)",
                }}
              />
              {SAMPLE.ctaSmall}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "linear-gradient(135deg, #FFD23F 0%, #E59A00 100%)",
                color: "#0a0a0a",
                padding: "20px 28px",
                borderRadius: 18,
                fontWeight: 900,
                fontSize: 32,
                letterSpacing: -0.5,
                boxShadow:
                  "0 18px 40px rgba(255,201,60,0.35), inset 0 1px 0 rgba(255,255,255,0.5)",
                width: "fit-content",
              }}
            >
              {SAMPLE.ctaMain}
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 6l-6 6 6 6"
                  stroke="#0a0a0a"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Tiny integrated QR */}
          <div
            style={{
              width: 130,
              background: "#fff",
              borderRadius: 16,
              padding: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              boxShadow: "0 14px 30px rgba(0,0,0,0.5)",
            }}
          >
            <img
              src={SAMPLE.qr}
              alt="QR"
              style={{ width: 110, height: 110, display: "block" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingMockups() {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-neutral-100"
      style={{ padding: "32px 16px 80px" }}
    >
      <div className="max-w-[1100px] mx-auto">
        <header style={{ marginBottom: 24, textAlign: "center" }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#111",
              marginBottom: 6,
              letterSpacing: -0.5,
            }}
          >
            Premium Dark — Mockup v3
          </h1>
          <p style={{ color: "#666", fontSize: 14 }}>
            מבוסס על הרפרנסים · תמונה דומיננטית · מחיר קבוצתי ענק · QR קטן ומשולב · 1080×1080
          </p>
        </header>

        <div className="flex flex-col items-center gap-10">
          {/* Scaled preview - feed view */}
          <div>
            <p style={{ textAlign: "center", color: "#888", fontSize: 12, marginBottom: 8 }}>
              תצוגה מוקטנת (40%) — איך זה ייראה בפיד
            </p>
            <div
              style={{
                width: 432, height: 432,
                overflow: "hidden",
                borderRadius: 14,
                boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              }}
            >
              <div
                style={{
                  transform: "scale(0.4)",
                  transformOrigin: "top left",
                  width: 1080, height: 1080,
                }}
              >
                <PremiumDarkV3 />
              </div>
            </div>
          </div>

          {/* Full size */}
          <div>
            <p style={{ textAlign: "center", color: "#888", fontSize: 12, marginBottom: 8 }}>
              גודל אמיתי — 1080×1080
            </p>
            <div
              style={{
                overflow: "auto",
                maxWidth: "100%",
                borderRadius: 14,
                boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
              }}
            >
              <PremiumDarkV3 />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
