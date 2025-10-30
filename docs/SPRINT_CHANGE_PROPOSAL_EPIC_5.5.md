# Sprint Change Proposal - Epic 5.5: Post-MVP Polish & Branding

**Date:** October 30, 2025  
**Prepared by:** Sarah (Product Owner)  
**Status:** ✅ **APPROVED**  
**Process Mode:** YOLO (Batched Analysis)

---

## Executive Summary

Following early beta testing and user feedback, we have identified 7 enhancement opportunities that will significantly improve user experience and establish professional Stena Line branding. These changes are non-breaking enhancements that address real user pain points and correct an implicit branding requirement.

**Total Effort:** 18-26 hours (2-3 days)  
**Risk Level:** 🟢 LOW (purely additive changes)  
**Impact:** ✅ POSITIVE (improves Criterion 7: User Preference vs Excel)

---

## User Feedback Summary

Test users provided the following feedback:

1. ❌ **Remove "System Health" button** - Technical link not needed for end users
2. 🐛 **Fix login redirect delay** - Seeing login page flash (~0.5-1s) when already logged in is confusing
3. 🔄 **Move sign-out to header** - Want logout + user info always visible, not buried in dashboard
4. 🌍 **Add language toggle** - Need Swedish/English support (flag icons in header)
5. ❓ **Add tooltips** - Unclear what action buttons do (especially column settings)
6. 📝 **SSN flexibility** - Allow personal numbers without dash, auto-format on save
7. 🎨 **Apply Stena branding** - Use Stena Line colors, fonts, logo, and background imagery

---

## Change Analysis

### Epic Impact: 🟢 LOW

- All 5 original epics complete
- Changes are additive polish, not structural
- No database schema changes
- No API endpoint changes
- Frontend presentation layer only

### Artifact Updates Required

**1. PRD (`docs/prd.md`):**

- ✅ Updated branding section with Stena Line specifications
- ✅ Added Epic 5.5 to epic list

**2. Architecture Document:**

- Pending: Add theming/branding section to `docs/architecture/frontend-architecture.md`

**3. Component Files:**

- Multiple UI components need updates (see stories below)

---

## Approved Stories

### **Story 5.6: Remove System Health Button**

**Priority:** 4th  
**Effort:** 0.5 hours  
**Changes:** Remove button from `src/app/page.tsx`, update test

### **Story 5.7: Fix Login Redirect Flash**

**Priority:** 3rd  
**Effort:** 1-2 hours  
**Changes:** Server-side auth check in middleware before rendering login page

### **Story 5.8: Move Sign-Out to Header**

**Priority:** 2nd  
**Effort:** 2-3 hours  
**Changes:** Update header component with email, role badge, sign-out button

### **Story 5.9: Swedish/English Language Toggle**

**Priority:** 5th  
**Effort:** 6-8 hours  
**Changes:** Implement i18n (next-intl), create translation files, add flag icons
**Dependency:** Swedish translations (may need native speaker review)

### **Story 5.10: Mouseover Tooltips**

**Priority:** 6th  
**Effort:** 2-3 hours  
**Changes:** Add shadcn/ui Tooltip components to all action buttons

### **Story 5.11: SSN Auto-Formatting**

**Priority:** 7th  
**Effort:** 1-2 hours  
**Changes:** Accept dashless input (10 digits), normalize to `YYMMDD-XXXX` on save

### **Story 5.12: Stena Line Branding**

**Priority:** 1st (HIGHEST)  
**Effort:** 6-8 hours  
**Changes:**

- Tailwind config: Add Stena colors (Core Blue #034592, Core Red #e41f1f, Beige #eae3d2)
- Add logo to header (`StenaLine_digital_rgb_positiv_STE_01118.png`)
- Background image on root/login pages (`220506_Stena_Danica_006_STE_02134.jpg`)
- Update button/card styling with Stena colors
- Verify WCAG AA accessibility

---

## Implementation Plan

### Sprint 6: Post-MVP Polish (2-3 days)

**Phase 1: Critical Branding & UX** (Day 1-2)

1. Story 5.12 - Stena Line Branding (6-8 hrs)
2. Story 5.8 - Sign-out in Header (2-3 hrs)
3. Story 5.7 - Fix Login Redirect (1-2 hrs)
4. Story 5.6 - Remove System Health Button (0.5 hrs)

**Phase 2: Language & Polish** (Day 2-3) 5. Story 5.9 - Language Toggle (6-8 hrs) 6. Story 5.10 - Tooltips (2-3 hrs) 7. Story 5.11 - SSN Auto-Format (1-2 hrs)

### Quality Gates

- ✅ All stories pass acceptance criteria
- ✅ Automated tests >95% pass rate maintained
- ✅ Visual QA (no regressions)
- ✅ Accessibility audit (WCAG AA)
- ✅ Smoke test checklist updated
- ✅ User Guide updated

---

## Risk Assessment

### Risk 1: Swedish translations incomplete/inaccurate

**Mitigation:** Start English-only, add Swedish incrementally with native speaker review  
**Impact:** Medium (can launch English-first)

### Risk 2: Stena colors may have accessibility issues

**Mitigation:** Test all combinations, adjust if needed (Stena guidelines already emphasize accessibility)  
**Impact:** Low (can adjust while staying close to brand)

### Risk 3: Branding may introduce visual bugs

**Mitigation:** Careful implementation, visual regression testing, multi-browser testing  
**Impact:** Low (CSS changes, easy to rollback)

---

## Success Metrics

**Definition of Done:**

1. ✅ All 7 stories completed with passing acceptance criteria
2. ✅ No test regressions (maintain >95% pass rate)
3. ✅ WCAG AA compliance verified
4. ✅ Deployed to staging for UAT

**Expected User Feedback Improvements:**

- "System looks professional and official" ✅
- "I didn't know what the button did" ✅ (tooltips)
- "The redirect flash was confusing" ✅ (fixed)
- "I prefer Swedish language" ✅ (language toggle)

---

## Next Steps

1. ✅ **APPROVED** - Sprint Change Proposal accepted
2. 📝 Create detailed story files → COMPLETE
3. 📝 Update PRD with Epic 5.5 → COMPLETE
4. 🔄 Handoff to Dev Agent for implementation
5. 🧪 QA review post-implementation
6. 🚀 Proceed to UAT with polished, branded system

---

## Files Created

### Epic Document

- `docs/prd/epic-5.5-post-mvp-polish-branding.md` ✅

### Story Files

- `docs/stories/5.6.remove-system-health-button.md` ✅
- `docs/stories/5.7.fix-login-redirect-flash.md` ✅
- `docs/stories/5.8.move-sign-out-to-header.md` ✅
- `docs/stories/5.9.language-toggle-swedish-english.md` ✅
- `docs/stories/5.10.mouseover-tooltips.md` ✅
- `docs/stories/5.11.ssn-auto-formatting.md` ✅
- `docs/stories/5.12.stena-line-branding.md` ✅

### Updated Documents

- `docs/prd.md` - Updated branding section and epic list ✅
- `docs/SPRINT_CHANGE_PROPOSAL_EPIC_5.5.md` - This document ✅

---

## Agent Handoff

**From:** Sarah (Product Owner)  
**To:** Dev Agent  
**Action:** Implement Stories 5.6-5.12 in priority order (5.12 → 5.8 → 5.7 → 5.6 → 5.9 → 5.10 → 5.11)  
**Timeline:** 2-3 business days  
**Resources:** `stena/` folder contains all branding assets (colors, logo, images)

---

**Prepared by:** Sarah (Product Owner)  
**Approved:** October 30, 2025  
**Next Review:** Post-implementation QA
