# Epic 7: Initial Setup & Production Readiness

## Epic Goal

Configure comprehensive masterdata column structure with correct external party permissions, complete translation coverage, and missing admin UX features to achieve production-ready state.

## Background

User acceptance testing revealed critical gaps preventing production deployment:
1. **Incomplete Masterdata Columns**: System has 10 columns but requires 23 for actual HR workflows
2. **Missing External Party Configurations**: Each external party (ÖMC, Payroll, Sodexo, Toplux) needs specific masterdata visibility and custom columns
3. **Translation Gaps**: Extensive missing translations across User Settings, Column Settings, Important Dates, and Dashboard pages
4. **Admin UX Issues**: Column Settings lacks inline editing and 'Create Column' button; filters for archived/terminated employees missing

This epic addresses all production readiness blockers identified in `Initial_Setup_Columns_And_Feedback.txt`.

## Stories

### Story 7.1: Comprehensive Masterdata Column Migration & Configuration

Configure all 23 required masterdata columns with correct external party visibility permissions.

**Key Deliverables:**
- Database migration adding missing columns (One, ISPS, Photo, Origo, Lönenivå, Mail lön, Bankuppgifter, LI, Passport, Kvitto C17/18, C17, Crewing/Done)
- Column configuration seed data for all external parties
- Display order enforcement

### Story 7.2: External Party Custom Column Seeding & Defaults

Pre-configure custom columns for each external party role at initial setup.

**Key Deliverables:**
- ÖMC: 13 custom columns (Hotel Required?, Room Number, Dietary Requirement?, etc.)
- Payroll: 4 custom columns (Ersatt, Fartyg, Klart/sign, Notering)
- Toplux: 9 custom columns (Stena ID-Origo nummer, Beställning gjord, etc.)
- Sodexo: No custom columns (as specified)

### Story 7.3: Complete Translation Coverage for All Pages

Eliminate all hardcoded strings and provide full Swedish/English translation coverage.

**Key Deliverables:**
- User Settings, Column Settings, Important Dates, Dashboard translations
- Archive/Terminate dialog translations
- Translation key standardization

### Story 7.4: Column Management UX Enhancements

Improve Column Settings interface with inline visibility editing and column creation button.

**Key Deliverables:**
- 'Create New Column' button for HR Admin
- Inline visibility toggles (remove 'Show' button)
- Keyboard navigation support

### Story 7.5: Dashboard Filter & UX Improvements

Implement archived/terminated employee filters and fix locale selector spacing.

**Key Deliverables:**
- Show Archived filter with visual distinction
- Show Terminated filter with visual distinction
- Fixed locale selector spacing (SE SV, GB EN)
- Button reordering (Terminate before Archive)
- Remove 'Live' button

## Success Criteria

-  All 23 masterdata columns visible and functional
-  External parties see only designated columns
-  All custom columns seeded per role
-  Zero hardcoded strings across entire application
-  Inline column permission editing functional
-  Archived/Terminated filters working
-  UAT confirms all feedback items resolved

## Dependencies

- Epic 3 (Column Configuration infrastructure)
- Epic 5.9 (Translation infrastructure)
- Epic 5.2 (Column Settings interface)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-02 | 1.0 | Epic 7 created from Sprint Change Proposal | Sarah (PO) |
