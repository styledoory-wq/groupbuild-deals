import { useMemo } from "react";

/**
 * WhatsApp Viral – v2 Mockup (single template, premium ad direction)
 *
 * Goals:
 *  - תמונה תופסת ~85% מהמודעה
 *  - מחיר קבוצתי = האלמנט הכי דומיננטי
 *  - מחיר רגיל קטן ומחוק
 *  - QR קטן ומשולב
 *  - CTA כחלק מהקריאייטיב (לא כפתור מערכת)
 *  - תחושת מודעה, לא כרטיס מידע
 */

const SAMPLE = {
  title: "ערכת טיפוח פנים מקצועית",
  supplier: "BeautyLab",
  city: "תל אביב",
  regularPrice: 480,
  groupPrice: 199,
  endsLabel: "נסגר היום ב-23:59",
  spotsLeft: 3,
  image:
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1400&q=80",
  qr: "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https%3A%2F%2Fgroupbuild.co.il%2Fd%2Fdemo&margin=0&color=0B3D2E",
};

function WhatsAppViralV2() {
  const discount = useMemo(
    () => Math.round((1 - SAMPLE.groupPrice / SAMPLE.regularPrice) * 100),
    []
  );

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
        background: "#000",
        borderRadius: 24,
      }}
    >
      {/* === IMAGE (85% of canvas) === */}
      <img
        src={SAMPLE.image}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "saturate(1.05) contrast(1.05)",
        }}
      />

      {/* Subtle top vignette so brand chip stays readable */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 260,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* Strong bottom gradient for price overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 620,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 38%, rgba(0,0,0,0.92) 100%)",
        }}
      />

      {/* === TOP BAR: Brand chip + Urgency pill === */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          right: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Brand chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.14)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.25)",
            padding: "10px 18px 10px 14px",
            borderRadius: 999,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, #25D366 0%, #0E6B5A 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "#fff",
              fontSize: 18,
              letterSpacing: -0.5,
            }}
          >
            G
          </div>
          <span
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: -0.3,
            }}
          >
            GroupBuild
          </span>
        </div>

        {/* Urgency pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#FF3B30",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 18,
            boxShadow: "0 8px 24px rgba(255,59,48,0.45)",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#fff",
              boxShadow: "0 0 0 4px rgba(255,255,255,0.35)",
            }}
          />
          נותרו {SAMPLE.spotsLeft} מקומות
        </div>
      </div>

      {/* === FLOATING DISCOUNT MEDALLION === */}
      <div
        style={{
          position: "absolute",
          top: 150,
          insetInlineStart: 50,
          width: 190,
          height: 190,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 30% 30%, #FFE066 0%, #FFC93C 55%, #E59A00 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#1a1a1a",
          fontWeight: 900,
          boxShadow:
            "0 20px 40px rgba(0,0,0,0.45), inset 0 -8px 16px rgba(0,0,0,0.12)",
          transform: "rotate(-8deg)",
          border: "3px solid rgba(255,255,255,0.55)",
        }}
      >
        <span style={{ fontSize: 24, lineHeight: 1, fontWeight: 700 }}>
          חיסכון
        </span>
        <span style={{ fontSize: 76, lineHeight: 1, letterSpacing: -3 }}>
          {discount}%
        </span>
      </div>

      {/* === BOTTOM CONTENT === */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0 56px 56px",
          color: "#fff",
        }}
      >
        {/* Supplier + location */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: 0.85,
            fontSize: 22,
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          <span>{SAMPLE.supplier}</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>{SAMPLE.city}</span>
        </div>

        {/* Product title */}
        <h1
          style={{
            margin: 0,
            fontSize: 64,
            lineHeight: 1.05,
            fontWeight: 900,
            letterSpacing: -1.5,
            textShadow: "0 2px 20px rgba(0,0,0,0.45)",
            marginBottom: 28,
          }}
        >
          {SAMPLE.title}
        </h1>

        {/* PRICE BLOCK — group price is the hero */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#FFC93C",
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              מחיר קבוצתי
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                lineHeight: 0.9,
              }}
            >
              <span
                style={{
                  fontSize: 240,
                  fontWeight: 900,
                  letterSpacing: -10,
                  color: "#fff",
                  textShadow: "0 6px 30px rgba(0,0,0,0.5)",
                }}
              >
                ₪{SAMPLE.groupPrice}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              paddingBottom: 28,
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16, opacity: 0.6 }}>במקום</span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "rgba(255,255,255,0.55)",
                textDecoration: "line-through",
                textDecorationThickness: 3,
              }}
            >
              ₪{SAMPLE.regularPrice}
            </span>
          </div>
        </div>

        {/* CTA RIBBON + QR */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 16,
          }}
        >
          {/* CTA — WhatsApp-styled ribbon, integrated to the creative */}
          <div
            style={{
              flex: 1,
              background:
                "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
              borderRadius: 22,
              padding: "22px 28px",
              display: "flex",
              alignItems: "center",
              gap: 18,
              boxShadow:
                "0 18px 40px rgba(37,211,102,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* WhatsApp glyph */}
            <svg
              width={48}
              height={48}
              viewBox="0 0 24 24"
              fill="#fff"
              aria-hidden
            >
              <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  color: "#fff",
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: -0.8,
                  lineHeight: 1.1,
                }}
              >
                הצטרפו לקבוצה בוואטסאפ
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {SAMPLE.endsLabel}
              </span>
            </div>

            {/* decorative arrow */}
            <div
              style={{
                marginInlineStart: "auto",
                width: 56,
                height: 56,
                borderRadius: 999,
                background: "rgba(255,255,255,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 6l-6 6 6 6"
                  stroke="#fff"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Tiny QR — integrated, not a giant block */}
          <div
            style={{
              width: 110,
              background: "#fff",
              borderRadius: 18,
              padding: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              boxShadow: "0 12px 24px rgba(0,0,0,0.35)",
            }}
          >
            <img
              src={SAMPLE.qr}
              alt="QR"
              style={{ width: 88, height: 88, display: "block" }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#0E6B5A",
                letterSpacing: 0.3,
              }}
            >
              סרקו להצטרפות
            </span>
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
            WhatsApp Viral — Mockup v2
          </h1>
          <p style={{ color: "#666", fontSize: 14 }}>
            תבנית אחת בלבד · כיוון מודעה (לא כרטיס מערכת) · 1080×1080
          </p>
        </header>

        {/* Scaled mobile preview */}
        <div className="flex flex-col items-center gap-10">
          <div>
            <p
              style={{
                textAlign: "center",
                color: "#888",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              תצוגה מוקטנת (40%) — איך זה ייראה בפיד
            </p>
            <div
              style={{
                width: 432,
                height: 432,
                overflow: "hidden",
                borderRadius: 12,
                boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              }}
            >
              <div
                style={{
                  transform: "scale(0.4)",
                  transformOrigin: "top left",
                  width: 1080,
                  height: 1080,
                }}
              >
                <WhatsAppViralV2 />
              </div>
            </div>
          </div>

          {/* Full-size canvas, scrollable */}
          <div>
            <p
              style={{
                textAlign: "center",
                color: "#888",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              תצוגה מלאה 1080×1080
            </p>
            <div
              style={{
                boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
                borderRadius: 24,
                overflow: "hidden",
              }}
            >
              <WhatsAppViralV2 />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
