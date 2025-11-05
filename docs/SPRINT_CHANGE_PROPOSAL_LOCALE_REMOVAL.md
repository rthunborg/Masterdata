# Sprint Change Proposal: Remove Locale Routing (Keep Swedish Text Constants)

**Date:** November 5, 2025  
**Prepared by:** Sarah (Product Owner)  
**Process Mode:** YOLO (Batched Analysis)  
**Change Trigger:** Requirement clarification - Swedish-only application confirmed

---

## Executive Summary

**Change Trigger:** User confirmed that **multi-language support is NOT needed**. Application should be **Swedish-only**.

**Core Decision:** Remove locale routing infrastructure (\
ext-intl\, URL prefixes, language toggle) while **keeping \messages/sv.json\** as centralized text constants for maintainability.

**Recommended Path:** Simplify to Swedish-only with lightweight translation utility.

**Impact Level:**  **MEDIUM** - Isolated to i18n layer, no business logic changes.

**Effort:** 3-4 hours (can be completed in half a working day)

---

## Section 1: Change Context

### Issue Definition

**Current State:** Application implements full bilingual support (Swedish/English) with:
- \
ext-intl\ package for internationalization
- Locale routing (\/sv/*\, \/en/*\ URL prefixes)
- Language toggle UI (  flags in header)
- Two translation files (\messages/sv.json\, \messages/en.json\)

**Requirement Clarification:** User confirmed **Swedish-only** is required.

**User Insight:** Keeping \sv.json\ file for text constants is valuable even for single-language app because:
-  Single source of truth for all text
-  Easy content updates without code changes
-  Consistency across application
-  Future-proofing if multi-language needed later

---

## Section 2: Recommended Solution

### What to KEEP 

1. **\messages/sv.json\** - Centralized Swedish text constants
2. **Translation pattern** - Using keys to reference text (e.g., \	.common.save\)
3. **Structured approach** - Organized by namespace (common, dashboard, forms, etc.)

### What to REMOVE 

1. **\
ext-intl\ package** - Heavy dependency (not needed for single language)
2. **Locale routing** - URL prefixes \/sv/\ and \/en/\
3. **Locale middleware logic** - Locale detection, validation, extraction
4. **Language toggle UI** - Flag buttons in header
5. **\messages/en.json\** - English translations
6. **\src/i18n.ts\** - next-intl configuration

### What to CREATE 

**Lightweight translation utility** (\src/lib/i18n.ts\):

\\\	ypescript
import translations from '@/../messages/sv.json';

export const t = translations;

// Optional: Create a hook for consistency with existing pattern
export function useTranslations() {
  return t;
}
\\\

**Usage is simple and type-safe:**
\\\	ypescript
import { t } from '@/lib/i18n';

<Button>{t.common.save}</Button>
<h1>{t.dashboard.title}</h1>
\\\

---

## Section 3: Implementation Plan

### Phase 1: Create New Translation Utility (30 mins)

**Task 1.1:** Create \src/lib/i18n.ts\

**Task 1.2:** Delete \messages/en.json\

**Task 1.3:** Keep \messages/sv.json\ unchanged 

### Phase 2: Remove next-intl Package (15 mins)

**Task 2.1:** Remove from \package.json\

**Task 2.2:** Run \pnpm install\ to update dependencies

**Task 2.3:** Delete \src/i18n.ts\ (old next-intl config file)

### Phase 3: Simplify Middleware (45 mins)

**File:** \middleware.ts\

**Changes:**
1. Remove \
ext-intl\ imports (lines 4-5)
2. Remove \intlMiddleware\ creation (lines 10-13)
3. Remove locale validation logic (lines 38-44)
4. Update all redirect URLs to remove locale prefix
5. Simplify to pure authentication + authorization middleware

**Estimated reduction:** ~40 lines

### Phase 4: Remove Language Toggle from Header (30 mins)

**File:** \src/components/layout/header.tsx\

**Changes:**
1. Remove language flag buttons
2. Remove locale switching logic
3. Update translation imports

### Phase 5: Update All Component Imports (60 mins)

**Pattern:** Replace \useTranslations('namespace')\ with direct \	.namespace.key\ access

### Phase 6: Update Navigation Links (30 mins)

**Pattern:** Remove locale prefix from all \Link\ and \outer.push\ calls

---

## Section 4: Benefits

### Immediate Benefits
-  Simpler codebase (~40 lines removed from middleware)
-  Smaller bundle size (remove \
ext-intl\ package)
-  Cleaner URLs (\/dashboard\ vs \/sv/dashboard\)

### Long-term Benefits
-  Maintainable text constants (\sv.json\ as single source)
-  Easy content updates
-  Future-ready (structure remains for multi-language if needed)

---

## Section 5: Testing Strategy

### Manual Test Checklist
- [ ] Root URL loads without redirect
- [ ] Login works without locale prefix
- [ ] All text displays in Swedish
- [ ] No language toggle in header
- [ ] All navigation links work
- [ ] Admin routes protected
- [ ] CRUD operations functional

---

## Section 6: Success Criteria

- [ ] \
ext-intl\ package removed
- [ ] \src/lib/i18n.ts\ created
- [ ] \messages/sv.json\ retained 
- [ ] Middleware simplified
- [ ] Language toggle removed
- [ ] All tests passing
- [ ] Documentation updated

---

**Status:**  **APPROVED**  
**Ready for Implementation**

**Prepared by:** Sarah (Product Owner)  
**Date:** November 5, 2025
