# Goals and Background Context

## Goals

- Replace fragile Excel-based workflow with secure, scalable web application for employee/candidate masterdata management
- Enable HR to maintain central masterdata repository with full CRUD capabilities
- Provide external parties (Sodexo, ÖMC, Payroll, Toplux) with role-based access to view relevant employee data and manage their own columns
- Eliminate VB script maintenance burden and data synchronization issues
- Achieve zero monthly operational costs through free-tier infrastructure (Supabase, Vercel)
- Deliver real-time data synchronization with <2 second latency
- Support 10 concurrent users managing up to 1,000 employee records initially
- Reduce HR administrative time on data management by 70% within 3 months
- Achieve 100% user adoption within 2 weeks of launch

## Background Context

The HR team currently manages employee and candidate data through an Excel workbook with VB scripts that synchronize data from a central "Masterdata" sheet to department-specific sheets for external parties (Payroll, Sodexo, ÖMC, Toplux). This approach has reached its breaking point, suffering from data consistency challenges, inadequate access control, technical fragility, collaboration friction, and placing undue burden on non-technical HR staff. The system doesn't scale as the organization grows, creates risk of data corruption, and lacks proper security controls for sensitive employee information.

The HR Masterdata Management System will provide a unified spreadsheet-like web interface where HR controls masterdata while external parties see customized views with relevant read-only masterdata fields plus their own editable columns. The solution emphasizes ease of use for non-technical users, leverages modern serverless technologies (Next.js, Supabase, Vercel) to maintain zero running costs, and provides real-time synchronization to eliminate the stale data issues inherent in file-based distribution.

## Change Log

| Date       | Version | Description                                                                  | Author  |
| ---------- | ------- | ---------------------------------------------------------------------------- | ------- |
| 2025-10-26 | 0.1     | Initial PRD draft                                                            | PM John |
| 2025-10-26 | 0.2     | Added termination tracking and CSV import; updated field names to match data | PM John |
| 2025-10-26 | 0.3     | Added important dates reference calendar for operational scheduling          | PM John |

---
