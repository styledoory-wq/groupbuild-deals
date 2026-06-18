## מטרה
ליצור שפה ויזואלית אחידה בין כל הדפים, לתקן את חוויית הניווט, ולכסות את כל מצבי ה-Loading / Empty / Error בעזרת רכיבים משותפים.

## מצב נוכחי (מה שמצאתי בקוד)
- קיים `PageHeader` ישן (`src/components/layout/PageHeader.tsx`) שכמעט לא בשימוש.
- קיימים רכיבי DS (`ScreenHeader`, `EmptyState`, `StatusChip`, `AppCard`) אך רק 4 דפים משתמשים בהם.
- ~40 דפים בנו לעצמם header inline (`sticky top-0 ... ArrowRight`) — קוד משוכפל וקצת שונה בכל מקום.
- ~15+ דפים מציגים סתם טקסט "טוען…" ללא skeleton/ספינר.
- אין רכיב `ErrorState` כלל — שגיאות מטופלות עם `toast` או טקסט נוקשה.

## תוכנית
שלוש פעימות קטנות, כל אחת אפשר לבדוק לבד.

### פעימה 1 — רכיבים משותפים חדשים
חדשים תחת `src/components/ds/`:
1. **`BackHeader`** — header דביק עליון אחיד (חץ חזרה + כותרת + תת-כותרת + slot ימני אופציונלי). מחליף את ה-header ה-inline שמופיע ב-~40 דפים.
2. **`LoadingState`** — ספינר מרכזי עם טקסט אופציונלי, וגם וריאנט `SkeletonList` לרשימות.
3. **`ErrorState`** — אייקון אדום + כותרת + תיאור + כפתור "נסה שוב".
4. הרחבת `EmptyState` הקיים עם variant `compact` עבור קופסאות פנימיות.

### פעימה 2 — מיגרציה ראשונית (Proof)
החלת הרכיבים החדשים על 6 דפים מרכזיים:
- `ResidentDashboard`, `DealsList`, `DealDetail`
- `CommitteeDashboard`, `CommitteeRequest` (בנינו הרגע)
- `SupplierDashboard`

המטרה: לוודא שהרכיבים מכסים את כל המקרים האמיתיים לפני מיגרציה רחבה.

### פעימה 3 — מיגרציה רחבה
- כל דפי הדייר הנותרים (`Favorites`, `MyOffers`, `Notifications`, `Search`, `BudgetPlanner`, וכו').
- כל דפי הספק.
- כל דפי האדמין (15 דפים — שם הכי הרבה "טוען…" inline).
- הסרת `PageHeader` הישן אם לא בשימוש.

## פרטים טכניים
```text
src/components/ds/
├── BackHeader.tsx      (חדש)
├── LoadingState.tsx    (חדש, +SkeletonList)
├── ErrorState.tsx      (חדש)
├── EmptyState.tsx      (הרחבה: variant)
└── index.ts            (export החדשים)
```

`BackHeader` API:
```tsx
<BackHeader title="ועד בית" subtitle={projectName} right={<BellButton/>} />
```

ללא שינויי backend, ללא שינויי לוגיקה — רק presentation.

## איך נתקדם
אבצע את **פעימה 1 + פעימה 2** מיד (רכיבים + 6 דפים מרכזיים).
אחרי שתסתכל ותאשר את הסגנון, ארוץ עם פעימה 3 על שאר הדפים.

מאשר?
