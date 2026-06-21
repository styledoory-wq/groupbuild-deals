# שדרוג כלי השיווק ל-AI + Templates

## הזרימה החדשה

```
ספק נכנס לכלי שיווק
   ↓
[שלב 1] AI Enhance (~6-10s, פעם אחת)
   - מייצר כותרת שיווקית, סאב-טייטל, CTA, תג דחיפות
   - מסיר רקע + מייצר רקע חדש מותאם לקטגוריה
   - שומר ב-DB (cache לעתיד)
   ↓
[שלב 2] Render 4 Templates במקביל
   - Premium Dark
   - WhatsApp Viral
   - Luxury Minimal
   - Modern Green
   ↓
גלריה: 4 כרטיסים בבחירת המועדף
   ↓
פעולות: הורדה / שיתוף וואטסאפ / שלח במייל
```

## רכיבים שייבנו

### 1. Edge Function חדש: `ai-enhance-deal`
- קלט: `dealId`
- פלט: `{ headline, subheadline, cta, urgencyTag, enhancedImageUrl }`
- שלב א: Gemini 3 Flash → JSON עם copy (`Output.object` schema)
- שלב ב: Gemini 2.5 Flash Image → רקע חדש מותאם (תמונת המוצר כקלט + prompt לפי קטגוריה)
- שמירה ב-storage `marketing-cards/{dealId}/enhanced.png` + cache ב-DB

### 2. טבלה חדשה: `deal_marketing_ai`
שמירת תוצרי AI כדי לא להריץ שוב כל פעם:
- `deal_id`, `headline`, `subheadline`, `cta`, `urgency_tag`, `enhanced_image_url`, `created_at`
- RLS: ספק רואה רק שלו

### 3. Edge Function מעודכן: `generate-marketing-card`
- קלט: `dealId, templateKey, format` (תאימות לאחור)
- טוען את `deal_marketing_ai` (אם אין → מפעיל ai-enhance-deal)
- בוחר `buildTree` לפי `templateKey`:
  - `premium-dark.ts` – רקע כהה, זהב, תמונה מלאה
  - `whatsapp-viral.ts` – הסגנון שכבר אישרת ב-Mockup v2
  - `luxury-minimal.ts` – ספליט, הרבה white space, טייפו עדין
  - `modern-green.ts` – הסגנון הקיים (לתאימות)
- כל buildTree מקבל את אותו `deal + aiCopy + image` ומחזיר tree ל-satori

### 4. UI חדש: `SupplierMarketingTools.tsx` (rewrite)
- Header: "המודעה שלך מוכנה"
- בזמן יצירה: סטטוס מתקדם ("AI כותב כותרת..." → "משפר תמונה..." → "מייצר 4 וריאציות...")
- גלריה 2×2 של 4 התבניות (מוקטנות) + indication "מומלץ" על אחת לפי AI
- לחיצה על תבנית → מסך מלא עם:
  - תצוגה גדולה
  - בחירת פורמט (square/story/banner)
  - כפתורי הורדה / וואטסאפ / מייל / העתק קישור
- כפתור "צור מחדש עם AI" (force refresh)

## פרטים טכניים

**מודלים:**
- Text: `google/gemini-3-flash-preview` (JSON output, מהיר)
- Image enhance: `google/gemini-2.5-flash-image` (Nano Banana, תומך edit + image input)
- prompt דוגמה לתמונה: "Professional product photography of [title], on a [category-specific] background, soft studio lighting, e-commerce ad quality, 1:1"

**ביצועים:**
- enhance רץ פעם אחת ומאוחסן ב-DB → 4 ה-renders מקבלים את אותה תמונה משופרת
- כל render רץ ב-invocation נפרד (כבר עובד היום) → 4 קריאות מקבילות, כל אחת ~2s

**הגנות:**
- אם AI נכשל → fallback לטקסטים מהדיל המקורי + תמונה מקורית
- credit exhaustion (402) → toast ברור + שימוש בנתוני הדיל ללא AI

## מה לא נכנס בשלב הזה
- A/B testing של תבניות
- שמירת בחירה של ספק
- אנליטיקס על שיתופים
- עריכה ידנית של כותרות שה-AI יצר (אפשר להוסיף אח"כ)

האם לאשר ולהתחיל פיתוח?