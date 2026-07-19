# Residents App — QA + Premium Polish Sprint

**Scope lock:** אפליקציית הדיירים בלבד. אפס נגיעה בקוד ספקים/אדמין או ב־Backend/סכמה.
כל השינויים מאחורי `includesResidentRoutes` / `VITE_APP_MODE=residents` או ב־components/hooks שמשמשים רק את זרם הדיירים.

---

## Phase 1 — Critical Bug Fixes (QA sweep)

מטרה: לאפס באגים חוסמים לפני שנוגעים בעיצוב.

1. **Safe Area בכל מסך iPhone**
   - לעבור על `MobileShell`, `GuestShell`, `ResidentShell`, headers של כל מסכי `/resident/*` + מסכי guest.
   - לוודא `padding-top: env(safe-area-inset-top)` יעיל בפועל (כרגע יש `pt-[env(safe-area-inset-top)]` ב־MobileShell — לבדוק כפילויות ו־headers שדורסים אותו עם `pt-0`).
   - להוסיף safe area גם ל־sticky headers, modals, sheets, ולמסך ההתחברות.

2. **קטגוריה → ספקים של אותה קטגוריה בלבד**
   - `CategoriesList` / `CategoryStages` / `CategorySuppliers`: לוודא ש־query מסנן לפי `categoryId` (כולל צאצאים אם צריך) ולא מחזיר את כל הספקים. לתקן route params + hook.

3. **כפתור "התחברות" → Sign In, לא Sign Up**
   - ב־`MobileShell` (הדסקטופ) וב־Gateway/GuestShell: לינק ל־`/auth/resident?mode=signin` (או ה־equivalent) במקום default signup.
   - לוודא ש־`Auth.tsx` מכבד את ה־mode ופותח את הטאב הנכון.

4. **Navigation audit**
   - לעבור כפתור־כפתור ב־BottomNav, GuestBottomNav, כל CTA במסכי בית/קטגוריה/עסקה/פרופיל.
   - לוודא `returnUrl` נשמר בכל gated action ומחזיר לאותו מקום אחרי login.
   - Back button (native + web) — בדיקה בכל flow.

5. **Auth flows**
   - הרשמה, התחברות (email + Google), logout, session persistence אחרי reload, reset password.
   - `SignupPromptSheet` — לוודא שהוא נסגר נכון ומעביר ל־auth עם returnUrl.

6. **Search / Filters / Share**
   - `GlobalSearchBar`, `Search.tsx`, סינוני קטגוריה/אזור — לתקן overflow ו־empty results.
   - Share של Deal (`SharedDeal`) — לוודא meta tags וקישור עובד.

7. **Layout hygiene**
   - Overflow-x horizontal בכל מסך, gutters אחידים, scroll ב־sheets/modals, keyboard-open behavior.

**Deliverable:** דוח QA קצר + כל התיקונים בקומיטים לוגיים.

---

## Phase 2 — Unified Design System

מרכיב הכל ל־tokens מרכזיים ב־`src/index.css` + `tailwind.config.ts` + `src/lib/designSystem.ts`. כל מסכי הדיירים ישתמשו רק ב־tokens.

- **Radius:** `--radius-sm/md/lg/xl` + `--radius-card`, `--radius-chip`, `--radius-button`.
- **Shadows:** להשתמש רק ב־`--shadow-soft/card/elevated/floating` הקיימים. להסיר `boxShadow` ידניים.
- **Spacing scale:** להשתמש רק ב־Tailwind scale + `--pad-x`. לאסור magic numbers ב־resident components.
- **Typography:** להצמיד לכל resident screen את `text-fs-*` הקיים; להגדיר `H1/H2/H3/Body/Caption` primitives ב־`components/ds/`.
- **Buttons/Chips:** לעבור על `Button` variants ו־chip components לוודא סט אחיד (primary, secondary, ghost, danger + sizes sm/md/lg).
- **Icons:** רק `lucide-react`, stroke=1.9, size 20/24 סטנדרט.
- **Colors:** להסיר כל `text-white`/`bg-[#...]` ב־`src/pages/resident/**` ו־guest shells → semantic tokens.
- **Empty / Loading / Skeleton:** `EmptyState` הקיים + `SkeletonCard`, `SkeletonList`, `SkeletonDetail` חדשים ב־`components/ds/`.
- **Motion:** `MOTION` tokens כבר קיימים — להשתמש דרך `transition-[all]` + duration/ease אחיד; להוסיף `fade-up`, `scale-in` על כל page mount.

---

## Phase 3 — Premium Polish (screen-by-screen)

עוברים על כל מסך דיירים לפי הרשימה, ומיישמים: white space, hierarchy, כרטיסים עם עומק, טיפוגרפיה נקייה, יחס תמונות אחיד (16:10 לכרטיס, 4:5 להירו), micro-interactions, haptics (`Haptics.impact` מ־Capacitor במסכי native).

מסכים: `ResidentsHome`, `CategoriesList`, `CategoryStages`, `CategorySuppliers`, `Search`, `SupplierProfile`, `DealDetail`, `DealsList`, `ResidentDashboard`, `ResidentProfile`/`Edit`, `Favorites`, `MyDeals/Vouchers/Documents/Offers/Demands/Deposits`, `Notifications`, `Auth`, `Onboarding`, `Welcome`, `Gateway`, `SharedDeal`, `NotFound`.

לכל מסך: לפני/אחרי screenshot ב־Playwright (390×844) + הערות שינויים.

---

## Phase 4 — UX Review (First-time user lens)

לעבור על אותה רשימת מסכים ולוודא לכל אחד:
- תוך 3 שניות ברור מה עושים במסך?
- Primary action בולט וייחודי?
- אין רעש/כפילויות/עומס?
- תחושה בגובה Apple/Airbnb/Linear/Stripe?

לתעד ממצאים ולתקן במקום.

---

## Phase 5 — WOW Factor

- Page transitions ב־`RouteTransition` — fade+slide עדין.
- Skeleton מדויק שמחקה את ה־layout האמיתי.
- Empty states עם איור/אייקון גדול + CTA.
- כרטיסי Deal/Supplier עם gradient overlay + hover/press states.
- Pull-to-refresh (`usePullToRefresh` קיים) בכל רשימה רלוונטית.
- Haptics עדין ב־CTA ראשיים ב־native.
- Splash → Home crossfade חלק.

---

## Technical Guardrails

- לא נוגעים ב־`src/pages/supplier/**`, `src/routes/SupplierRoutes.tsx`, `SupplierRoutes` gating, אדמין, Backend, migrations, edge functions.
- כל resident screen עובר build + Playwright smoke (390×844 + iPhone 14 Pro viewport).
- אין hardcoded colors ב־`src/pages/resident/**` בסוף Phase 2.
- Bundle size לא גדל ביותר מ־5%.

## Execution Order

Phase 1 → אישור → Phase 2 → אישור → Phases 3+4+5 מסך־מסך (batched, ~5 מסכים לכל סבב) → QA סופי → Ready לגרסה יציבה.

אאשר איתך אחרי Phase 1 לפני שממשיך.
