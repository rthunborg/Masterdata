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

## Story 5.13: Complete Translation Coverage & Root Page Fixes

As a **Swedish-speaking user**,  
I want **all UI text to be fully translated and the root page to be Swedish-only**,  
so that **the system feels native and professional in my language**.

### Acceptance Criteria

1. **Root Page Redesign (Swedish-Only)**
   - Root page (`/page.tsx`) should NOT use locale routing (no redirect to `/en` or `/sv`)
   - All content on root page in Swedish only
   - App title: "Stena Line Säsongsrekrytering" (not "HR Masterdata Management System")
   - Description: Concise, focused on capabilities (max 2-3 sentences)
   - Remove all third-party company mentions (Sodexo, Bluegarden, Silkeborg Forsyning)
   - Keep "Logga in till systemet" button (Swedish)

2. **Navigation Links Translation**
   - Dashboard layout sidebar links translated:
     - "Employees" → "Anställda" (Swedish) / "Employees" (English)
     - "Important Dates" → "Viktiga datum" (Swedish) / "Important Dates" (English)

3. **Employee Table Empty State** - "No employees found. Click 'Add Employee' to create your first record." → Fully translated

4. **Important Dates Page Translations**
   - Page description paragraph (remove "ÖMC" third-party reference)
   - Subtitle paragraph fully translated
   - Table headers: "Week Number", "Year", "Category" → Translated
   - Filter label: "Filter by Category" → Translated
   - Dropdown option: "All categories" → Translated
   - Empty state: "No important dates found." → Translated

5. **Admin Users Page Translations**
   - Description paragraph fully translated
   - Table headers: "Role", "Created", "Actions" → Translated
   - Button: "Deactivate" → Translated

6. **Admin Columns Page Translations** - Form label: "Column Name" → Translated

7. **Translation File Completeness**
   - All missing translation keys added to `messages/en.json` and `messages/sv.json`
   - No hardcoded English strings remain in Swedish locale
   - Translation key audit completed across all `.tsx` files

8. **Third-Party References Removed**
   - No mentions of "Sodexo", "Bluegarden", "Silkeborg Forsyning", "ÖMC" in user-facing text
   - Generic references used where needed (e.g., "external partners" if necessary)

**Estimated Effort:** 4-6 hours (1 working day)

**Priority:** **P1 (High)** - Production quality issue affecting Swedish user experience

**Dependencies:** Story 5.9 and 5.9.1 must be complete (already ✅ Done)

**Background:** User feedback revealed ~20 untranslated strings and content issues after Story 5.9 deployment. This story addresses the remaining translation gaps and root page requirements.

**Status:** ⏳ **CURRENT** - Approved and ready for development

**See:** `docs/stories/5.13.complete-translation-coverage-and-root-page-fixes.md` for detailed implementation plan

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

## Business Rules Clarifications

**Discovered During Story 5.9 UAT:**

1. **Root Page Language Policy:**
   - The root landing page (`/page.tsx`) must be Swedish-only (no locale routing)
   - Rationale: Primary target audience is Swedish-speaking Stena Line HR staff
   - Exception: Authenticated users are redirected to locale-aware dashboard

2. **Third-Party Company References:**
   - Avoid mentioning specific external partner company names in user-facing text
   - Examples to avoid: "Sodexo", "Bluegarden", "Silkeborg Forsyning", "ÖMC"
   - Use generic terms like "external partners" or "third-party administrators" if needed
   - Rationale: Partnerships may change, text should remain evergreen

3. **App Naming Convention:**
   - Official app name: **"Stena Line Säsongsrekrytering"** (Stena Line Seasonal Recruitment)
   - Use in: Root page title, browser metadata, login page header
   - Internal dashboard can use "HR Masterdata" for clarity

---

## Epic Summary

**Total Stories:** 9 (Stories 5.6-5.13 including hotfixes 5.9.1 and 5.13)

**Priority Order:**

1. ✅ Story 5.12 (Stena Branding) - Highest priority for deployment credibility - **DONE**
2. ✅ Story 5.8 (Sign-out in Header) - Important UX improvement - **DONE**
3. ✅ Story 5.7 (Fix Login Redirect) - Annoying bug, high visibility - **DONE**
4. ✅ Story 5.6 (Remove System Health Button) - Quick win, 30 min - **DONE**
5. ✅ Story 5.9 (Language Toggle) - Important for Swedish users - **DONE**
6. ✅ Story 5.9.1 (Fix Language Toggle Issues) - P0 CRITICAL HOTFIX - **DONE**
7. ⏳ **Story 5.13 (Complete Translation Coverage & Root Page Fixes)** - **P1 HIGH PRIORITY** - **CURRENT**
8. ⏸️ Story 5.10 (Tooltips) - Nice-to-have UX polish - **PENDING**
9. ⏸️ Story 5.11 (SSN Auto-Format) - Convenience feature - **PENDING**

**Epic Progress:** 67% complete (6/9 stories done)

**Note:** User acceptance testing after Story 5.13 revealed additional requirements documented in **Epic 6: Employee Form & Data Management Enhancements**. Epic 5.5 can be completed independently while Epic 6 addresses UAT feedback.

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
