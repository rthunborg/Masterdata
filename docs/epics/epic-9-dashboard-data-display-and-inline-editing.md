---
title: Epic 9 – Improve Dashboard Data Display and Inline Editing
status: planned
---

## Epic Overview

**Goal:** Ensure dashboard fields (SSN, hiring date, `loneniva`, booleans, etc.) display correct values, inline editing is stable and localized, and no-op edits cause no redundant updates or rerenders.

This epic covers multiple UX and correctness issues on the dashboard:

- Incorrect display of SSN and hiring date (showing `-` even when data exists).
- Crashes and incorrect behavior when editing `loneniva`.
- Incorrect validation for unchanged empty fields and English error messages.
- Suboptimal boolean inline editing using checkboxes instead of localized dropdowns.

## Definition of Done (Epic Level)

- **No-op edits:** For any inline-editable field on the dashboard, if the user enters edit mode and exits without changing the value, **no update is sent** and **no redundant rerender** is triggered.
- **Localization:** Validation and error messages on the dashboard that are part of these changes are correctly localized to Swedish where specified.
- **Tests:** All related dashboard tests are **updated or added** so that the dashboard test suite is fully green once all stories in this epic are completed.

## Stories in this Epic

- **9.6 – Fix Dashboard SSN and Hiring Date Display**  
  `docs/stories/9.6.fix-dashboard-ssn-and-hiring-date-display.md`

- **9.7 – Fix Dashboard Loneniva Inline Edit Crash and Dropdown**  
  `docs/stories/9.7.fix-dashboard-loneniva-inline-edit-crash-and-dropdown.md`

- **9.8 – Fix Dashboard Empty Field Validation and Localization**  
  `docs/stories/9.8.fix-dashboard-empty-field-validation-and-localization.md`

- **9.9 – Replace Dashboard Boolean Checkbox Inline Edit with Dropdown**  
  `docs/stories/9.9.replace-dashboard-boolean-checkbox-inline-edit-with-dropdown.md`

## Post-Review Follow-ups
- [Story 9.7] [Medium] Replace hardcoded English tooltip "Can only be edited after..." with translation (AC4)
- [Story 9.7] [Medium] Replace hardcoded English error fallback "Failed to update" with translation (AC4)
- [Story 9.7] [Medium] Replace hardcoded English tooltip "This field is read-only..." with translation (AC4)


