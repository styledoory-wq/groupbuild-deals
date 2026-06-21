import { useState } from "react";
import logo from "@/assets/groupbuild-logo-cropped.png";

const SAMPLE = {
  title: "שיפוץ מטבח מלא",
  punch: "במחיר קבוצתי!",
  category: "מטבחים",
  bullets: ["איכות גבוהה", "אחריות מלאה", "התקנה מקצועית"],
  regularPrice: 28000,
  groupPrice: 16900,
  discountPct: 40,
  image:
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1600&q=80",
  url: "groupbuild.co.il/offer/12345",
};

const nis = (n: number) => "₪" + n.toLocaleString("he-IL");

/* ---------- Brand header (logo + tagline) ---------- */
function BrandHeader({ dark = false }: { dark?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <img
        src={logo}
        alt="GroupBuild"
        style={{
          width: 56,
          height: 56,
          objectFit: "contain",
          background: "#F2B400",
          borderRadius: 14,
          padding: 6,
        }}
      />
      <div style={{ lineHeight: 1 }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: 30,
            color: dark ? "#fff" : "#0b1a3a",
            letterSpacing: -0.5,
          }}
        >
          GroupBuild
        </div>
        <div
          style={{
            fontSize: 14,
            color: dark ? "rgba(255,255,255,.7)" : "#6b7280",
            marginTop: 4,
          }}
        >
          קונים יחד, משלמים פחות
        </div>
      </div>
    </div>
  );
}

/* ---------- Price box (regular + group + discount badge) ---------- */
function PriceBox({
  accent,
  badgeBg,
  badgeText = "#fff",
}: {
  accent: string;
  badgeBg: string;
  badgeText?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 10,
        background: "#fff",
        borderRadius: 14,
        padding: 12,
        boxShadow: "0 6px 20px rgba(0,0,0,.08)",
      }}
    >
      <div
        style={{
          background: "#f3f4f6",
          borderRadius: 10,
          padding: "10px 14px",
          minWidth: 120,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 14, color: "#6b7280" }}>מחיר רגיל</div>
        <div
          style={{
            fontSize: 22,
            color: "#9ca3af",
            textDecoration: "line-through",
            fontWeight: 700,
          }}
        >
          {nis(SAMPLE.regularPrice)}
        </div>
      </div>
      <div
        style={{
          background: accent,
          color: "#0b1a3a",
          borderRadius: 10,
          padding: "10px 18px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}>
          המחיר בקבוצה
        </div>
        <div
          style={{
            fontSize: 38,
            fontWeight: 900,
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          {nis(SAMPLE.groupPrice)}
        </div>
      </div>
      <div
        style={{
          width: 78,
          height: 78,
          borderRadius: "50%",
          background: badgeBg,
          color: badgeText,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "center",
          fontWeight: 900,
          lineHeight: 1,
          boxShadow: "0 6px 14px rgba(0,0,0,.15)",
        }}
      >
        <div style={{ fontSize: 13 }}>הנחה</div>
        <div style={{ fontSize: 26, marginTop: 2 }}>{SAMPLE.discountPct}%</div>
      </div>
    </div>
  );
}

/* Fake QR placeholder */
function QR({ size = 88, bg = "#fff" }: { size?: number; bg?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: 8,
        padding: 6,
        boxShadow: "0 2px 8px rgba(0,0,0,.12)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundImage:
            "repeating-conic-gradient(#111 0 25%, #fff 0 50%)",
          backgroundSize: "10px 10px",
          borderRadius: 4,
        }}
      />
    </div>
  );
}

function CTA({
  bg,
  color = "#0b1a3a",
  text = "להצטרפות להצעה",
}: {
  bg: string;
  color?: string;
  text?: string;
}) {
  return (
    <div
      style={{
        background: bg,
        color,
        padding: "16px 26px",
        borderRadius: 12,
        fontWeight: 900,
        fontSize: 22,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

function FooterLine({ color = "#fff" }: { color?: string }) {
  return (
    <div
      style={{ fontSize: 16, color, opacity: 0.85, display: "flex", gap: 8 }}
    >
      <span>👥</span>
      <span>ככל שיותר מצטרפים – המחיר יורד!</span>
    </div>
  );
}

/* =================================================================
   1. PREMIUM DARK
================================================================= */
function PremiumDark() {
  return (
    <div
      dir="rtl"
      style={{
        width: 1080,
        height: 1080,
        background: "#0d0f12",
        position: "relative",
        fontFamily: "'Heebo', sans-serif",
        color: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Image bg full */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${SAMPLE.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(13,15,18,.95) 0%, rgba(13,15,18,.78) 45%, rgba(13,15,18,.25) 100%)",
        }}
      />

      {/* Content right side */}
      <div
        style={{
          position: "relative",
          padding: 56,
          width: 640,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <BrandHeader dark />

        <div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: -2,
            }}
          >
            {SAMPLE.title}
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: "#F2B400",
              marginTop: 4,
              letterSpacing: -1,
            }}
          >
            {SAMPLE.punch}
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,.8)",
              marginTop: 18,
            }}
          >
            {SAMPLE.bullets.join(" · ")}
          </div>
        </div>

        <PriceBox accent="#F2B400" badgeBg="#0b1a3a" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <FooterLine />
          <CTA bg="#F2B400" />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <QR size={84} />
          <div style={{ fontSize: 16, opacity: 0.65 }}>{SAMPLE.url}</div>
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   2. CLEAN WHITE
================================================================= */
function CleanWhite() {
  return (
    <div
      dir="rtl"
      style={{
        width: 1080,
        height: 1080,
        background: "#fff",
        position: "relative",
        fontFamily: "'Heebo', sans-serif",
        color: "#0b1a3a",
        overflow: "hidden",
        display: "flex",
      }}
    >
      {/* Left content */}
      <div
        style={{
          width: 600,
          padding: 56,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <BrandHeader />

        <div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: -2,
            }}
          >
            חדר אמבטיה
          </div>
          <div
            style={{
              fontSize: 58,
              fontWeight: 900,
              color: "#1d6aff",
              marginTop: 4,
            }}
          >
            מעוצב ומושלם
          </div>
          <div
            style={{
              display: "inline-block",
              background: "#1d6aff",
              color: "#fff",
              padding: "10px 22px",
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 22,
              marginTop: 18,
            }}
          >
            במחיר קבוצתי משתלם
          </div>
        </div>

        <PriceBox accent="#dbe8ff" badgeBg="#1d6aff" />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 18,
          }}
        >
          {SAMPLE.bullets.map((b) => (
            <div
              key={b}
              style={{
                fontSize: 16,
                color: "#475569",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: "#f1f5fb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                ✓
              </div>
              {b}
            </div>
          ))}
        </div>

        <div
          style={{
            background: "#1d6aff",
            borderRadius: 14,
            padding: "18px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#fff",
          }}
        >
          <QR size={70} />
          <div style={{ fontSize: 20, fontWeight: 700, textAlign: "center", flex: 1 }}>
            ככל שיותר מצטרפים – המחיר יורד!
          </div>
        </div>
      </div>

      {/* Right image */}
      <div
        style={{
          flex: 1,
          backgroundImage: `url(${SAMPLE.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0 100%)",
        }}
      />
    </div>
  );
}

/* =================================================================
   3. LUXURY MINIMAL  (centered, lots of whitespace)
================================================================= */
function LuxuryMinimal() {
  return (
    <div
      dir="rtl"
      style={{
        width: 1080,
        height: 1080,
        background: "#fafafa",
        position: "relative",
        fontFamily: "'Heebo', sans-serif",
        color: "#0b1a3a",
        overflow: "hidden",
        padding: 56,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandHeader />
        <div
          style={{
            fontSize: 16,
            color: "#6b7280",
            border: "1px solid #e5e7eb",
            borderRadius: 999,
            padding: "8px 18px",
          }}
        >
          {SAMPLE.category}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginTop: 26 }}>
        <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>
          מזגן עילי
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: "#1d6aff",
            marginTop: 6,
          }}
        >
          מתקדם וחסכוני
        </div>
        <div
          style={{
            display: "inline-block",
            background: "#e8f3ec",
            color: "#0E6B5A",
            padding: "10px 22px",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 22,
            marginTop: 16,
          }}
        >
          במחיר קבוצתי
        </div>
      </div>

      {/* Image */}
      <div
        style={{
          flex: 1,
          marginTop: 24,
          backgroundImage: `url(${SAMPLE.image})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />

      <PriceBox accent="#d4f5e2" badgeBg="#0E6B5A" />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 22,
        }}
      >
        <QR size={86} />
        <FooterLine color="#374151" />
        <CTA bg="#0E6B5A" color="#fff" />
      </div>
    </div>
  );
}

/* =================================================================
   4. WHATSAPP VIRAL
================================================================= */
function WhatsAppViral() {
  return (
    <div
      dir="rtl"
      style={{
        width: 1080,
        height: 1080,
        background: "#0a3d2e",
        position: "relative",
        fontFamily: "'Heebo', sans-serif",
        color: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* image top */}
      <div
        style={{
          height: 460,
          position: "relative",
          backgroundImage: `url(${SAMPLE.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 30%, rgba(10,61,46,.85) 100%)",
          }}
        />
        <div style={{ position: "absolute", top: 36, right: 36 }}>
          <BrandHeader dark />
        </div>
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 36,
            background: "#FFD60A",
            color: "#0b1a3a",
            borderRadius: 999,
            padding: "12px 24px",
            fontWeight: 900,
            fontSize: 22,
          }}
        >
          ⚡ מבצע קבוצתי
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 30,
            right: 36,
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -2,
            textShadow: "0 4px 18px rgba(0,0,0,.5)",
          }}
        >
          {SAMPLE.title}
          <div style={{ fontSize: 40, color: "#FFD60A", marginTop: 8 }}>
            {SAMPLE.punch}
          </div>
        </div>
      </div>

      {/* bottom */}
      <div
        style={{
          flex: 1,
          padding: 48,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              background: "#FFD60A",
              color: "#0b1a3a",
              borderRadius: "50%",
              width: 150,
              height: 150,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              lineHeight: 1,
              transform: "rotate(-8deg)",
              boxShadow: "0 10px 30px rgba(0,0,0,.4)",
            }}
          >
            <div style={{ fontSize: 22 }}>חיסכון</div>
            <div style={{ fontSize: 70, marginTop: 4, letterSpacing: -3 }}>
              {SAMPLE.discountPct}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,.7)", textDecoration: "line-through" }}>
              במקום {nis(SAMPLE.regularPrice)}
            </div>
            <div style={{ fontSize: 28, color: "rgba(255,255,255,.85)", marginTop: 4 }}>
              המחיר בקבוצה
            </div>
            <div
              style={{
                fontSize: 130,
                fontWeight: 900,
                color: "#FFD60A",
                letterSpacing: -5,
                lineHeight: 1,
              }}
            >
              {nis(SAMPLE.groupPrice)}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#25D366",
            borderRadius: 18,
            padding: "26px 0",
            textAlign: "center",
            fontWeight: 900,
            fontSize: 40,
            color: "#fff",
            boxShadow: "0 14px 36px rgba(37,211,102,.5)",
          }}
        >
          הצטרף לקבוצה עכשיו ←
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <QR size={86} />
          <FooterLine />
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   5. MODERN GREEN
================================================================= */
function ModernGreen() {
  return (
    <div
      dir="rtl"
      style={{
        width: 1080,
        height: 1080,
        background: "#fff",
        position: "relative",
        fontFamily: "'Heebo', sans-serif",
        color: "#0b1a3a",
        overflow: "hidden",
        display: "flex",
      }}
    >
      {/* image left */}
      <div
        style={{
          flex: 1,
          backgroundImage: `url(${SAMPLE.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* right panel */}
      <div
        style={{
          width: 600,
          padding: 48,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(180deg, #f8fbf9 0%, #ecf6f1 100%)",
        }}
      >
        <BrandHeader />

        <div>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2 }}>
            פרגולה ודק
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: "#0E6B5A",
              marginTop: 4,
            }}
          >
            לגינה מושלמת
          </div>
          <div
            style={{
              display: "inline-block",
              background: "#0E6B5A",
              color: "#fff",
              padding: "10px 22px",
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 22,
              marginTop: 18,
            }}
          >
            במחיר קבוצתי מיוחד
          </div>
        </div>

        <PriceBox accent="#d4f5e2" badgeBg="#0E6B5A" />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 18,
          }}
        >
          {["עץ איכותי", "התקנה מקצועית", "אחריות מלאה"].map((b) => (
            <div
              key={b}
              style={{
                fontSize: 15,
                color: "#475569",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: "#0E6B5A", fontSize: 20 }}>●</span>
              {b}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <QR size={84} />
          <CTA bg="#0E6B5A" color="#fff" />
        </div>

        <FooterLine color="#475569" />
      </div>
    </div>
  );
}

const TEMPLATES = [
  { key: "premium-dark", name: "Premium Dark", desc: "רקע כהה · זהב · יוקרה", Comp: PremiumDark },
  { key: "clean-white", name: "Clean White", desc: "לבן נקי · כחול · Apple-like", Comp: CleanWhite },
  { key: "luxury-minimal", name: "Luxury Minimal", desc: "ממורכז · אוויר · מינימליסטי", Comp: LuxuryMinimal },
  { key: "whatsapp-viral", name: "WhatsApp Viral", desc: "% ענק · CTA ירוק · ויראלי", Comp: WhatsAppViral },
  { key: "modern-green", name: "Modern Green", desc: "GroupBuild brand · אמרלד", Comp: ModernGreen },
];

export default function MarketingTemplatesPreview() {
  const [active, setActive] = useState(TEMPLATES[0].key);
  const Comp = TEMPLATES.find((t) => t.key === active)!.Comp;
  const scale = typeof window !== "undefined" && window.innerWidth < 500 ? 0.34 : 0.5;

  return (
    <div dir="rtl" className="min-h-screen bg-neutral-100 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">תצוגה מקדימה · תבניות שיווק</h1>
        <p className="text-sm text-neutral-600 mb-5">
          5 תבניות בעיצוב מסחרי (1080×1080). בחר תבנית לתצוגה מוגדלת.
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
              borderRadius: 16,
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
            כל 5 התבניות
          </div>
          {TEMPLATES.map((t) => {
            const s = scale * 0.62;
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
                    borderRadius: 12,
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
