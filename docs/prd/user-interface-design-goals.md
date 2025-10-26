# User Interface Design Goals

## Overall UX Vision

The HR Masterdata Management System prioritizes **familiarity and simplicity** for users transitioning from Excel. The interface centers on a powerful, spreadsheet-like table that feels immediately comfortable to non-technical users while providing modern web application benefits (real-time sync, role-based security, cloud access). The design philosophy is "Excel without the pain" - preserving the editing paradigms users know while eliminating file distribution, script maintenance, and permission management headaches.

For HR Admins, the system provides additional administrative capabilities through a separate configuration interface that emphasizes visual feedback and preview modes to build confidence in permission settings. The admin experience prioritizes transparency ("show me what Sodexo sees") over complex permission matrices.

## Key Interaction Paradigms

- **Inline Editing**: Click any editable cell to edit in place (similar to Excel), with visual affordance showing editability
- **Keyboard Navigation**: Support arrow keys to navigate between cells, Enter to edit, Escape to cancel
- **Column Sorting**: Click column headers to sort ascending/descending with visual sort indicator
- **Search-as-you-type**: Global search box with instant filtering of visible rows
- **Role Preview**: HR Admin can switch views with a role selector dropdown to "View as Sodexo", "View as ÖMC", etc.
- **Visual Status Indicators**: Clear badges, colors, or icons to distinguish read-only vs editable, masterdata vs custom columns, archived vs active employees
- **Minimal Clicks**: Common actions (edit cell, sort, search) require single click or keystroke
- **Responsive Feedback**: Loading states, success confirmations, and error messages appear inline without blocking the interface

## Core Screens and Views

From a product perspective, the following screens deliver the PRD values and goals:

1. **Login Screen** - Simple username/password form with role assignment on authentication
2. **Main Data Table View** - Primary workspace showing employee records with role-based columns (all users)
3. **Important Dates Calendar** - Reference calendar showing key operational dates by week/category (all users, HR editable)
4. **Admin Configuration Panel** - Column permission management and user account management (HR Admin only)
5. **Role Preview Mode** - Embedded in main table view, allows HR Admin to toggle between different role perspectives
6. **Add/Edit Employee Modal or Inline Form** - Interface for HR Admin to create new employee records or edit all masterdata fields
7. **User Account Management Screen** - Interface for HR Admin to create/deactivate user accounts and assign roles

## Accessibility

**WCAG AA Compliance** - The system should meet WCAG 2.1 Level AA standards including:

- Keyboard navigation for all functionality
- Sufficient color contrast ratios (4.5:1 for normal text)
- Screen reader support with proper ARIA labels
- Focus indicators for interactive elements
- Text resize support up to 200% without loss of functionality

## Branding

**Minimal, Professional, Functional** - No specific corporate branding requirements. The interface should emphasize clarity and usability over visual flair:

- Clean, modern aesthetic using a standard component library (e.g., shadcn/ui with Tailwind CSS)
- Neutral color palette with strategic use of color for status indicators
- Clear typography optimized for readability
- Icons used sparingly to support recognition (edit, delete, archive, search, sort indicators)
- Consistent spacing and layout following design system conventions

## Target Device and Platforms

**Web Responsive - Desktop Primary** - The application targets desktop browsers as the primary platform with responsive design considerations:

- Optimized for desktop screens (1280x720 and above)
- Horizontal scrolling acceptable for many columns (similar to Excel)
- Responsive down to tablet landscape (1024px) for viewing data
- Mobile phone access not prioritized for MVP (complex table editing is impractical on small screens)
- Modern browser support: Chrome, Firefox, Edge, Safari (last 2 major versions)

---
