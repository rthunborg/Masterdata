# Sprint Change Proposal: Epic 8 - Enhanced Employee Management Features

**Date:** November 8, 2025  
**Prepared by:** Sarah (Product Owner)  
**Status:**  **APPROVED** - Ready for Implementation  
**Interaction Mode:** YOLO Mode (Batch Analysis)

---

## Executive Summary

New operational requirements have been identified for production deployment. This proposal documents the creation of **Epic 8: Enhanced Employee Management Features** with 16 stories covering gender/rank enum restrictions, visual status indicators, conditional field logic, important dates capacity management, and automated room assignment.

**Impact:** Additive features only - no conflicts with existing epics (1-7)  
**Effort:** 8-12 weeks (4 implementation phases)  
**Priority:** HIGH - Production dependency

---

## Artifacts Updated

###  Completed Updates

1. **docs/prd/epic-list.md**
   - Added Epic 8 to project epic list

2. **docs/prd/requirements.md**
   - Added FR22-FR40 (19 new functional requirements)

3. **docs/epic-8-enhanced-employee-management-features.md** [NEW FILE]
   - Complete epic document with 16 detailed stories
   - Comprehensive acceptance criteria (10-14 per story)
   - Technical implementation notes with code samples
   - Database migration specifications
   - Dependencies and testing strategy
   - 4-phase implementation plan

4. **docs/SPRINT_CHANGE_PROPOSAL_EPIC_8.md** [THIS FILE]
   - Formal change proposal documentation
   - Approval record
   - Implementation handoff plan

---

## Epic 8 Story Summary

### Phase 1: Enum Fields & Visual Indicators (1-2 weeks)
- **8.1** Gender & Rank Enum Restrictions
- **8.2** Visual Status Indicators for Boolean Fields

### Phase 2: Conditional Logic & Time-Based Status (2-3 weeks)
- **8.3** One Field Time-Based Status Logic (Yellow 24hrs  Green)
- **8.4** Talmundo Field with Conditional Editability
- **8.5** Crewing/Done Field Conditional Logic
- **8.6** Lönenivå Enum Field with Visual Indicator

### Phase 3: Important Dates Capacity & Features (3-4 weeks)
- **8.7** Important Dates Capacity Management (max_spots, remaining_spots)
- **8.8** Important Dates Assigned Employees List
- **8.9** ÖMC Two-Day Date Format
- **8.10** PE3 Date Time Selection (HH:MM)
- **8.11** Important Dates Deadline Columns
- **8.12** PE3 Import with Automatic Deadline Calculation

### Phase 4: Termination & Room Assignment (2-3 weeks)
- **8.13** Terminated Employee Repayment Tracking
- **8.14** Termination Date Clear Logic with Spot Management
- **8.15** Hotel Required Field in Create Form
- **8.16** ÖMC Room Assignment Algorithm

---

## Key Technical Changes

### Database Schema
**New Columns on employees table:**
- `one_marked_at` TIMESTAMPTZ
- `talmundo` BOOLEAN
- `hotel_required` BOOLEAN
- `room_number_shared` INTEGER
- `repayment_needed_omc` DATE
- `repayment_needed_pe3` DATE

**Type Changes on employees table:**
- `gender`  CHECK constraint ('Man', 'Woman')
- `rank`  CHECK constraint ('SEV', 'CHEF')
- `loneiva`  INTEGER CHECK (0-7)
- Convert to BOOLEAN: `one`, `isps`, `photo`, `origo`, `mail_lon`, etc.

**New Columns on important_dates table:**
- `max_spots` INTEGER
- `remaining_spots` INTEGER
- `assigned_employees` TEXT[]
- `deadline_cancel` DATE
- `deadline_submit` DATE
- `time_value` TIME

### New Business Logic Services
- `src/lib/services/one-field-status.ts` - Time-based status calculation
- `src/lib/services/crewing-validation.ts` - Prerequisite field checking
- `src/lib/services/date-capacity.ts` - Spot management
- `src/lib/services/pe3-deadline-calculator.ts` - Automatic deadline calculation
- `src/lib/services/termination-workflow.ts` - Repayment tracking & date clearing
- `src/lib/services/room-assignment.ts` - Automated room number assignment

### New UI Components
- `src/components/dashboard/status-badge.tsx` - Green/yellow visual indicators
- `src/components/dashboard/assigned-employees-modal.tsx` - Employee list viewer

---

## Implementation Handoff

### Next Steps (in order):

1. **Architect Review** (Est: 1-2 days)
   - Validate database schema changes
   - Review business logic service architecture
   - Confirm migration strategy
   - Approve technical approach

2. **Story 8.1 Implementation** (Est: 2-3 days)
   - Create database migration for gender/rank enum constraints
   - Update employee forms and validation
   - Test with existing data

3. **Story 8.2 Implementation** (Est: 2-3 days)
   - Create StatusBadge component
   - Integrate into employee table rendering
   - Test visual consistency

4. **Continue Sequential Implementation**
   - Follow phase order (8.18.28.3...8.16)
   - Test each story before proceeding
   - Update documentation as needed

### Success Criteria for Epic Completion
-  All 16 stories pass acceptance criteria
-  Database migrations tested in staging environment
-  Unit tests cover business logic services (>80% coverage)
-  Integration tests validate workflows
-  Manual testing checklist completed
-  Performance benchmarks met (table rendering <2s with 1000+ employees)
-  Documentation updated (API docs, user guide)

---

## Risk Assessment & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Room assignment algorithm complexity | Medium | Comprehensive test cases, manual override capability |
| Time-based status logic (One field 24hr timer) | Medium | Use database timestamps, client polling/real-time |
| Spot management concurrency | Medium | Database transactions, row-level locks |
| Database migration with existing data | Low | Staging environment testing, rollback plan |
| Performance (badge rendering) | Low | Memoization, efficient queries |

---

## Approval Record

**Approved by:** User (Project Stakeholder)  
**Approval Date:** November 8, 2025  
**Approval Mode:** Explicit ("Approved")

**Documents Approved:**
-  Epic 8 creation with 16 stories
-  PRD updates (epic list, functional requirements)
-  Architecture updates (database schema, service layer)
-  Implementation plan (4 phases, 8-12 weeks)

---

## Change Checklist Summary

 **Section 1: Understand Trigger & Context**
- Trigger: New feature requirements from stakeholder
- Type: Newly discovered operational requirements
- Impact: Additive features, no conflicts with existing work

 **Section 2: Epic Impact Assessment**
- Current epics (1-7): No changes required
- New epic (8): 16 stories, production dependency
- Sequence: Logical build on existing infrastructure

 **Section 3: Artifact Conflict & Impact Analysis**
- PRD: Added Epic 8 and FR22-FR40
- Architecture: Database schema updates, new services
- Frontend Spec: New UI components for visual indicators
- No conflicts identified

 **Section 4: Path Forward Evaluation**
- Selected Path: Option 1 - Direct Adjustment/Integration
- Rationale: Well-defined requirements, additive changes, incremental implementation
- Feasibility: HIGH

 **Section 5: Sprint Change Proposal Components**
- Issue summary: Clear operational requirements
- Epic impact: Epic 8 creation, no changes to epics 1-7
- Artifact adjustments: PRD, architecture, testing docs
- Path: Incremental implementation
- Action plan: 4-phase development

 **Section 6: Final Review & Handoff**
- All checklist items completed
- Proposal accurately reflects analysis
- User approval obtained
- Next steps confirmed

---

## Contact & Questions

**Product Owner:** Sarah (PO Agent)  
**For Questions:** Refer to epic-8-enhanced-employee-management-features.md for detailed specifications

**Epic 8 Document Location:** `docs/epic-8-enhanced-employee-management-features.md`

---

**END OF SPRINT CHANGE PROPOSAL**
