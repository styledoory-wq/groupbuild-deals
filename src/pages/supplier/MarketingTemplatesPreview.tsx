import { useState } from "react";

// Sample data for preview
const SAMPLE = {
  title: "שיפוץ מטבח מלא",
  category: "מטבחים",
  subtitle: "מטבח מעוצב עם שיש קיסר וגימור פרמיום",
  regularPrice: 48000,
  groupPrice: 32900,
  discountPct: 31,
  validUntil: "31.07.2026",
  image:
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1600&q=80",
  brand: "GroupBuild",
  cta: "הזמן עכשיו",
};

const nis = (n: number) => "₪" + n.toLocaleString("he-IL");

/* ---------- Template 1: Premium Dark ---------- */
function PremiumDark() {
  return (
    <div
      dir="rtl"
      style={{
        width: 1080,
        height: 1080,
        background:
          "linear-gradient(160deg,#0b0d10 0%,#16191f 55%,#0b0d10 100%)",
        position: "relative",
        fontFamily: "'Heebo', sans-serif",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Image dominant */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          height: 720,
          backgroundImage: `url(${SAMPLE.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Image vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          height: 720,
          background:
            "linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,0) 35%, rgba(11,13,16,.95) 100%)",
        }}
      />
      {/* Discount badge */}
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 48,
          background:
            "linear-gradient(135deg,#D4AF37 0%,#F4D77A 50%,#B8902C 100%)",
          color: "#1a1408",
          borderRadius: 999,
          padding: "18px 36px",
          fontWeight: 900,
          fontSize: 44,
          letterSpacing: -1,
          boxShadow: "0 18px 40px rgba(212,175,55,.35)",
        }}
      >
        −{SAMPLE.discountPct}%
      </div>
      {/* Brand */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 56,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 6,
          color: "rgba(255,255,255,.85)",
        }}
      >
        GROUPBUILD
      </div>
      {/* Bottom content */}
      <div style={{ position: "absolute", left: 56, right: 56, bottom: 64 }}>
        <div
          style={{
            fontSize: 26,
            color: "#D4AF37",
            fontWeight: 600,
            letterSpacing: 4,
            marginBottom: 14,
          }}
        >
          {SAMPLE.category.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            lineHeight: 1.05,
            marginBottom: 26,
            letterSpacing: -2,
          }}
        >
          {SAMPLE.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            borderTop: "1px solid rgba(212,175,55,.35)",
            paddingTop: 28,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,.55)",
                marginBottom: 6,
                textDecoration: "line-through",
              }}
            >
              {nis(SAMPLE.regularPrice)}
            </div>
            <div
              style={{
                fontSize: 132,
                fontWeight: 900,
                lineHeight: 1,
                color: "#fff",
                letterSpacing: -4,
              }}
            >
              {nis(SAMPLE.groupPrice)}
            </div>
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,.7)",
                marginTop: 8,
              }}
            >
              מחיר קבוצתי בלעדי
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              color: "#0b0d10",
              borderRadius: 16,
              padding: "26px 40px",
              fontWeight: 800,
              fontSize: 32,
            }}
          >
            {SAMPLE.cta}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Template 2: Clean White ---------- */
function CleanWhite() {
  return (
    <div
      dir="rtl"
      style={{
        width: 1080,
        height: 1080,
        background: "#fafafa",
        position: "relative",
        fontFamily: "'Heebo', sans-serif",
        color: "#0a0a0a",
        overflow: "hidden",
      }}
    >
      {/* Top: text */}
      <div
        style={{
          padding: "84px 84px 0",
          height: 540,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 56,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4 }}>
            GROUPBUILD
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#666",
              border: "1px solid #e5e5e5",
              borderRadius: 999,
              padding: "10px 22px",
            }}
          >
            {SAMPLE.category}
          </div>
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -3,
            marginBottom: 24,
          }}
        >
          {SAMPLE.title}.
        </div>
        <div style={{ fontSize: 30, color: "#555", lineHeight: 1.3 }}>
          {SAMPLE.subtitle}
        </div>
      </div>

      {/* Bottom: image with overlay price card */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 540,
          backgroundImage: `url(${SAMPLE.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 84,
          bottom: 84,
          background: "#fff",
          borderRadius: 28,
          padding: "36px 44px",
          boxShadow: "0 30px 80px rgba(0,0,0,.18)",
          minWidth: 460,
        }}
      >
        <div style={{ fontSize: 20, color: "#888", marginBottom: 8 }}>
          מחיר קבוצתי
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          {nis(SAMPLE.groupPrice)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 14,
            fontSize: 22,
          }}
        >
          <span style={{ color: "#999", textDecoration: "line-through" }}>
            {nis(SAMPLE.regularPrice)}
          </span>
          <span
            style={{
              background: "#0a0a0a",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            חיסכון {SAMPLE.discountPct}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Template 3: Luxury Minimal ---------- */
function LuxuryMinimal() {
  return (
    <div
      dir="rtl"
      style={{
        width: 1080,
        height: 1080,
        background: "#f4f1ec",
        position: "relative",
        fontFamily: "'Heebo', sans-serif",
        color: "#1a1a1a",
        overflow: "hidden",
        padding: 64,
        boxSizing: "border-box",
      }}
    >
      {/* Top label */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 20,
          letterSpacing: 6,
          color: "#6b6055",
        }}
      >
        <span>GROUPBUILD · קולקציה</span>
        <span>{SAMPLE.validUntil}</span>
      </div>

      {/* Big centered image */}
      <div
        style={{
          marginTop: 56,
          width: "100%",
          height: 640,
          backgroundImage: `url(${SAMPLE.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: 4,
        }}
      />

      {/* Bottom split */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: 56,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 84,
              fontWeight: 500,
              lineHeight: 1,
              letterSpacing: -1,
            }}
          >
            {SAMPLE.title}
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#6b6055",
              marginTop: 14,
              letterSpacing: 2,
            }}
          >
            ⎯⎯ {SAMPLE.category}
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontSize: 18,
              letterSpacing: 4,
              color: "#6b6055",
              marginBottom: 6,
            }}
          >
            FROM
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 300,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            {nis(SAMPLE.groupPrice)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Template 4: WhatsApp Viral ---------- */
function WhatsAppViral() {
  return (
    <div
      dir="rtl"
      style={{
        width: 1080,
        height: 1080,
        position: "relative",
        fontFamily: "'Heebo', sans-serif",
        overflow: "hidden",
        background: "#075E54",
      }}
    >
      {/* Image background full */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${SAMPLE.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.25) 30%, rgba(0,0,0,.85) 100%)",
        }}
      />

      {/* Giant discount burst */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: -40,
          width: 360,
          height: 360,
          background: "#FFD60A",
          borderRadius: "50%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#0a0a0a",
          transform: "rotate(-12deg)",
          boxShadow: "0 20px 50px rgba(0,0,0,.4)",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, marginBottom: -10 }}>
          חיסכון
        </div>
        <div style={{ fontSize: 160, fontWeight: 900, lineHeight: 1, letterSpacing: -6 }}>
          {SAMPLE.discountPct}%
        </div>
      </div>

      {/* Brand chip */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          background: "rgba(255,255,255,.95)",
          color: "#075E54",
          borderRadius: 999,
          padding: "12px 24px",
          fontWeight: 800,
          fontSize: 22,
        }}
      >
        ⚡ מבצע קבוצתי
      </div>

      {/* Bottom price + CTA */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          bottom: 60,
          color: "#fff",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            lineHeight: 1.05,
            marginBottom: 8,
            textShadow: "0 4px 24px rgba(0,0,0,.6)",
          }}
        >
          {SAMPLE.title}
        </div>
        <div
          style={{
            fontSize: 26,
            color: "rgba(255,255,255,.85)",
            marginBottom: 24,
            textDecoration: "line-through",
          }}
        >
          במקום {nis(SAMPLE.regularPrice)}
        </div>
        <div
          style={{
            fontSize: 170,
            fontWeight: 900,
            lineHeight: 1,
            color: "#FFD60A",
            letterSpacing: -6,
            textShadow: "0 8px 30px rgba(0,0,0,.5)",
            marginBottom: 28,
          }}
        >
          {nis(SAMPLE.groupPrice)}
        </div>
        <div
          style={{
            background: "#25D366",
            color: "#fff",
            borderRadius: 20,
            padding: "30px 0",
            textAlign: "center",
            fontWeight: 900,
            fontSize: 44,
            boxShadow: "0 16px 40px rgba(37,211,102,.5)",
          }}
        >
          הצטרף לקבוצה עכשיו ←
        </div>
      </div>
    </div>
  );
}

/* ---------- Template 5: Modern Green ---------- */
function ModernGreen() {
  return (
    <div
      dir="rtl"
      style={{
        width: 1080,
        height: 1080,
        position: "relative",
        fontFamily: "'Heebo', sans-serif",
        overflow: "hidden",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Image top 60% */}
      <div
        style={{
          height: 640,
          position: "relative",
          backgroundImage: `url(${SAMPLE.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 40,
            background: "rgba(255,255,255,.95)",
            borderRadius: 14,
            padding: "10px 20px",
            fontSize: 22,
            fontWeight: 700,
            color: "#0E6B5A",
          }}
        >
          {SAMPLE.category}
        </div>
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 40,
            background: "#0E6B5A",
            color: "#fff",
            borderRadius: 999,
            padding: "14px 28px",
            fontSize: 28,
            fontWeight: 900,
          }}
        >
          −{SAMPLE.discountPct}%
        </div>
      </div>

      {/* Bottom emerald panel */}
      <div
        style={{
          flex: 1,
          background:
            "linear-gradient(135deg,#0E6B5A 0%,#0a5547 60%,#083d34 100%)",
          color: "#fff",
          padding: "44px 60px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: -1,
              }}
            >
              {SAMPLE.title}
            </div>
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,.75)",
                marginTop: 8,
              }}
            >
              בתוקף עד {SAMPLE.validUntil}
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, opacity: .9 }}>
            GROUPBUILD
          </div>
        </div>

        <div
          style={{
            marginTop: 26,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,.6)",
                textDecoration: "line-through",
              }}
            >
              {nis(SAMPLE.regularPrice)}
            </div>
            <div
              style={{
                fontSize: 120,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -4,
              }}
            >
              {nis(SAMPLE.groupPrice)}
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              color: "#0E6B5A",
              borderRadius: 16,
              padding: "22px 36px",
              fontWeight: 900,
              fontSize: 28,
              whiteSpace: "nowrap",
            }}
          >
            {SAMPLE.cta} ←
          </div>
        </div>
      </div>
    </div>
  );
}

const TEMPLATES = [
  { key: "premium-dark", name: "Premium Dark", desc: "יוקרה כהה · תמונה דומיננטית · תג זהב", Comp: PremiumDark },
  { key: "clean-white", name: "Clean White", desc: "Apple-like · טיפוגרפיה גדולה · כרטיס מחיר צף", Comp: CleanWhite },
  { key: "luxury-minimal", name: "Luxury Minimal", desc: "מינימליסטי עם Serif · דגש על תמונה", Comp: LuxuryMinimal },
  { key: "whatsapp-viral", name: "WhatsApp Viral", desc: "אגרסיבי · % ענק · CTA ירוק", Comp: WhatsAppViral },
  { key: "modern-green", name: "Modern Green", desc: "GroupBuild brand · פאנל אמרלד תחתון", Comp: ModernGreen },
];

export default function MarketingTemplatesPreview() {
  const [active, setActive] = useState(TEMPLATES[0].key);
  const Comp = TEMPLATES.find((t) => t.key === active)!.Comp;
  // scale 1080 -> ~360 for mobile preview
  const scale = typeof window !== "undefined" && window.innerWidth < 500 ? 0.32 : 0.5;

  return (
    <div dir="rtl" className="min-h-screen bg-neutral-100 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">תצוגה מקדימה · תבניות שיווק</h1>
        <p className="text-sm text-neutral-600 mb-5">
          5 תבניות בעיצוב Premium. בחר תבנית כדי לראות בגודל מלא (פוסט 1080×1080).
        </p>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-5 -mx-4 px-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition ${
                active === t.key
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-700 border-neutral-300"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-neutral-500 mb-3">
            {TEMPLATES.find((t) => t.key === active)!.desc}
          </div>
          <div
            style={{
              width: 1080 * scale,
              height: 1080 * scale,
              margin: "0 auto",
              overflow: "hidden",
              borderRadius: 12,
              boxShadow: "0 20px 60px rgba(0,0,0,.15)",
            }}
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top right",
                width: 1080,
                height: 1080,
              }}
            >
              <Comp />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div className="text-sm font-semibold text-neutral-700">
            כל 5 התבניות במבט אחד
          </div>
          {TEMPLATES.map((t) => {
            const s = 0.28;
            const TComp = t.Comp;
            return (
              <div key={t.key} className="bg-white rounded-2xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="font-bold">{t.name}</div>
                  <div className="text-xs text-neutral-500">{t.desc}</div>
                </div>
                <div
                  style={{
                    width: 1080 * s,
                    height: 1080 * s,
                    margin: "0 auto",
                    overflow: "hidden",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      transform: `scale(${s})`,
                      transformOrigin: "top right",
                      width: 1080,
                      height: 1080,
                    }}
                  >
                    <TComp />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
