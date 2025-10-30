# Epic 5.5: Post-MVP Polish & Branding

**Epic Goal**: Apply user feedback-driven enhancements and Stena Line branding to polish the MVP for production deployment. This includes UX improvements (fixing redirect delays, adding tooltips, improving header navigation), bilingual support (Swedish/English), SSN input flexibility, and comprehensive Stena Line visual identity implementation.

**Epic Origin**: User acceptance testing feedback from early beta testers

**Estimated Total Effort**: 22-32 hours (approximately 3-4 days)

**Note:** Story 5.9.1 added as critical hotfix to resolve production issues discovered in Story 5.9

---

## Story 5.6: Remove System Health Button from Root Page

As a **user visiting the root page**,  
I want **a clean landing page without technical links**,  
so that **the interface is focused on core actions (login)**.

### Acceptance Criteria

1. Remove "System Health" button from `src/app/page.tsx`
2. Remove or update associated test in `tests/unit/pages/landing-page.test.tsx` to verify button is NOT present
3. Keep `/api/health` endpoint functional for monitoring (just remove UI link)
4. Update UI to have single primary CTA: "Login to System"
5. Verify landing page still loads correctly with simplified UI

**Estimated Effort:** 0.5 hours

---

## Story 5.7: Fix Login Redirect Flash for Authenticated Users

As an **authenticated user**,  
I want **to be redirected immediately to dashboard when visiting `/login`**,  
so that **I don't see a confusing flash of the login page**.

### Acceptance Criteria

1. Update `middleware.ts` or login page logic to check authentication status BEFORE rendering login page
2. If user is already authenticated, perform redirect server-side (SSR check) instead of client-side
3. Use Next.js redirect or server-side session check to prevent flash
4. Test: Navigate to `/login` while logged in → should immediately redirect to `/dashboard` with NO visible login page render
5. Ensure unauthenticated users still see login page normally

**Estimated Effort:** 1-2 hours

---

## Story 5.8: Move Sign-Out to Header with User Info

As a **logged-in user**,  
I want **to see my email, role, and sign-out button in the top header**,  
so that **I have consistent access to account info and logout across all pages**.

### Acceptance Criteria

1. Update `src/components/layout/header.tsx` (or create if doesn't exist) to display:
   - User email (e.g., "hr@example.com")
   - User role badge (e.g., "HR Admin", "Sodexo")
   - Sign-out button (icon or text)
2. Remove sign-out button from dashboard body if present
3. Header should be visible on all authenticated pages
4. Clicking sign-out triggers logout and redirects to login page
5. Style header to match overall design system (Tailwind + shadcn/ui)
6. Responsive: On mobile, consider dropdown menu for user info + sign-out

**Estimated Effort:** 2-3 hours

---

## Story 5.9: Add Swedish/English Language Toggle

As a **user**,  
I want **to switch between Swedish and English languages using flag icons in the header**,  
so that **I can use the system in my preferred language**.

### Acceptance Criteria

1. Add Swedish flag (🇸🇪) and English flag (🇬🇧) icon buttons to header
2. Implement i18n library (e.g., `next-i18next` or `next-intl`)
3. Create translation files for Swedish (`sv.json`) and English (`en.json`) with all UI text
4. Clicking flag toggles language preference (stored in localStorage or cookie)
5. All text in UI updates immediately to selected language (page refresh acceptable for MVP)
6. Default language: **Swedish** (business requirement - Stena Line Sweden operations)
7. Translate at minimum: Navigation, buttons, form labels, error messages, table headers
8. User's language preference persists across sessions

**Estimated Effort:** 6-8 hours (includes translation effort)

**Dependencies:** Translation files need to be created (Swedish translations may require native speaker)

**Status:** ✅ **DONE** (95% complete - see Story 5.9.1 for production hotfix)

---

## Story 5.9.1: Fix Language Toggle Production Issues (HOTFIX)

As a **Swedish-speaking user**,  
I want **the language toggle to work reliably with Swedish as the default language**,  
so that **I can use the system in my native language without constant resets to English**.

### Acceptance Criteria

1. **Default Locale Changed to Swedish**
   - System defaults to Swedish language on first visit
   - URL redirects to `/sv` instead of `/en` for new users

2. **Language Persistence Across Navigation**
   - User selects Swedish → navigates to another page → language stays Swedish
   - User selects English → navigates to another page → language stays English
   - Cookie-based persistence working correctly (NEXT_LOCALE cookie)

3. **Complete Translation Coverage**
   - No English text visible when Swedish is selected (except technical/API errors)
   - No translation placeholder keys visible (e.g., "common.allColumns")
   - All UI elements properly translated in both languages

4. **Improved Language Toggle UX**
   - Both Swedish (🇸🇪) and English (🇬🇧) flags always visible in header
   - Active language flag is highlighted (solid button style)
   - Inactive language flag is clickable (ghost button style)
   - Active language flag is disabled (prevents accidental re-clicks)

5. **Responsive Design**
   - Desktop (≥640px): Both flags visible with "SV" and "EN" text labels
   - Mobile (<640px): Both flags visible (emoji only, no text labels)
   - Minimum 44px touch target on mobile for accessibility

6. **Accessibility**
   - ARIA labels present for both flag buttons
   - `aria-pressed` attribute indicates active language
   - Keyboard navigation works (Tab + Enter to switch)

7. **Missing Translation Keys Added**
   - `admin.allColumns` → "All Columns" / "Alla kolumner"
   - `admin.masterdataOnly` → "Masterdata Only" / "Endast stamdata"
   - `admin.customOnly` → "Custom Only" / "Endast anpassade"
   - `admin.configureRolesDescription` → Full description text

8. **Production Validation**
   - Deploy to production
   - Test all three issues resolved in live environment
   - Verify cookie persistence across browser sessions

**Estimated Effort:** 4-6 hours (can be completed in 1 working day)

**Priority:** **P0 (Critical)** - Blocks Story 5.9 completion

**Dependencies:** Story 5.9 must be deployed (already deployed - 95% complete)

**Background:** Story 5.9 was deployed to production with three critical defects discovered during user acceptance testing:

1. Default locale is English (should be Swedish)
2. Incomplete translations with placeholder keys visible
3. Poor language toggle UX (only shows one flag at a time)

**See:** `docs/stories/5.9.1.fix-language-toggle-issues.md` for detailed implementation plan

---

## Story 5.10: Add Mouseover Tooltips to Action Buttons

As a **user**,  
I want **to see descriptive tooltips when hovering over action buttons**,  
so that **I understand what each button does before clicking**.

### Acceptance Criteria

1. Add tooltips (using shadcn/ui Tooltip component) to:
   - Column settings action buttons (Edit, Delete, Hide, View permissions)
   - Employee table row actions (Edit, Archive, Terminate)
   - Add Employee button
   - Import CSV button
   - Add Custom Column button
   - Important Dates actions
2. Tooltip text should be concise and descriptive (e.g., "Edit employee details", "Archive employee (soft delete)")
3. Tooltips appear on hover after ~500ms delay
4. Tooltips are accessible (keyboard focus triggers tooltip)
5. Tooltips work on all major browsers

**Estimated Effort:** 2-3 hours

---

## Story 5.11: SSN Field Auto-Formatting (Dashless Input)

As an **HR Admin**,  
I want **to enter Swedish personal numbers without dashes and have the system auto-format them**,  
so that **data entry is faster and more flexible**.

### Acceptance Criteria

1. SSN input field accepts both formats:
   - With dash: `YYMMDD-XXXX` (e.g., `850315-1234`)
   - Without dash: `YYMMDDXXXX` (e.g., `8503151234`)
2. Client-side validation accepts both formats as valid
3. On save (create or edit employee), backend normalizes SSN to standard format with dash (`YYMMDD-XXXX`)
4. Database stores SSN in normalized format
5. Display SSN in table with dash format
6. Update validation regex/Zod schema to accept 10-digit or 11-character (with dash) format
7. Test: Enter SSN without dash → saves successfully with dash added
8. Test: Enter SSN with dash → saves as-is

**Estimated Effort:** 1-2 hours

---

## Story 5.12: Apply Stena Line Branding & Design Overhaul

As a **Stena Line HR user**,  
I want **the system to reflect Stena Line's visual identity**,  
so that **it feels like an official Stena Line tool**.

### Acceptance Criteria

**1. Color Palette:**

- Update Tailwind config to include Stena Line colors:
  - **Core Blue:** `#034592` (primary brand color)
  - **Core Red:** `#e41f1f` (accent color)
  - **White:** `#ffffff` (background)
  - **Black:** `#1a1a1a` (text)
  - **Beige:** `#eae3d2` (secondary background/text boxes)
  - **Secondary Blue:** `#3344dd` (link highlighting)
- Apply Core Blue as primary button color
- Apply Core Red for accents, alerts, or secondary CTAs
- Use Beige for card backgrounds or alternate sections

**2. Typography:**

- Review Stena Line font guidelines (if available in `stena/` folder or website)
- Update font family in Tailwind config to match Stena fonts (or use similar web-safe alternative)

**3. Logo:**

- Add Stena Line logo (`StenaLine_digital_rgb_positiv_STE_01118.png`) to header (top-left or centered)
- Logo should link to root page or dashboard

**4. Background Images:**

- Use `220506_Stena_Danica_006_STE_02134.jpg` (Stena Danica ocean image) as background on:
  - Root page (`src/app/page.tsx`)
  - Login page (`src/app/(auth)/login/page.tsx`)
- Apply subtle overlay to ensure text readability

**5. Accessibility:**

- Follow Stena color profile instructions: "white or black text colour to secure accessibility"
- Ensure all text meets WCAG AA contrast ratios (4.5:1 for normal text)
- Test with Core Blue backgrounds + white text
- Test with Core Red accents

**6. Inspiration:**

- Reference `https://www.stenaline.se/` for design patterns, spacing, and visual hierarchy

**7. Component Updates:**

- Update button variants to use Stena colors
- Update cards, modals, and dialogs with Stena styling
- Maintain clean, professional aesthetic (not overly branded - subtle integration)

**Estimated Effort:** 6-8 hours

**Dependencies:**

- Access to `stena/` folder resources ✅ (confirmed available)
- Optional: Stena Line brand guidelines document (if available)

---

## Epic Summary

**Total Stories:** 8 (Stories 5.6-5.12 + Story 5.9.1 hotfix)

**Priority Order:**

1. ✅ Story 5.12 (Stena Branding) - Highest priority for deployment credibility - **DONE**
2. ✅ Story 5.8 (Sign-out in Header) - Important UX improvement - **DONE**
3. ✅ Story 5.7 (Fix Login Redirect) - Annoying bug, high visibility - **DONE**
4. ✅ Story 5.6 (Remove System Health Button) - Quick win, 30 min - **DONE**
5. ✅ Story 5.9 (Language Toggle) - Important for Swedish users - **DONE** (95% complete)
6. ⏳ **Story 5.9.1 (Fix Language Toggle Issues)** - **P0 CRITICAL HOTFIX** - **IN PROGRESS**
7. ⏸️ Story 5.10 (Tooltips) - Nice-to-have UX polish - **PENDING**
8. ⏸️ Story 5.11 (SSN Auto-Format) - Convenience feature - **PENDING**

**Epic Progress:** 62.5% complete (5/8 stories done)

**Definition of Done for Epic 5.5:**

1. ✅ All 8 stories pass acceptance criteria
2. ✅ Automated tests updated and passing (>95% pass rate maintained)
3. ✅ Visual QA completed (no regressions)
4. ✅ Accessibility audit passed (WCAG AA compliance)
5. ✅ Smoke test checklist updated with new features
6. ✅ User Guide updated with language toggle and branding screenshots
7. ✅ Deployed to staging environment for final UAT

**Impact on MVP Success Criteria:**

- ✅ Addresses Criterion 7 (User Preference vs Excel) with improved UX and professional branding
- ✅ Makes system feel official and trustworthy
- ✅ Reduces user confusion and improves discoverability
- ✅ Supports bilingual users (Swedish/English)

---

**Created:** October 30, 2025  
**Status:** Ready for Development
