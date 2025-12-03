# hr-masterdata - Epic Breakdown

**Author:** Raz
**Date:** 2025-01-27
**Project Level:** MVP
**Target Scale:** 10 concurrent users, 1,000 employee records

---

## Overview

This document provides the complete epic and story breakdown for hr-masterdata, decomposing the requirements from the [PRD](./prd.md) into implementable stories.

**Living Document Notice:** This is the initial version. It will be updated after UX Design and Architecture workflows add interaction and technical details to stories.

---

## Functional Requirements Inventory

**FR1:** The system must provide a secure login interface with username/password authentication supporting 5 distinct role types: HR Admin, Sodexo, ÖMC, Payroll, and Toplux.

**FR2:** HR Admin users must be able to manually create, activate, and deactivate user accounts with assigned roles through an admin interface.

**FR3:** HR Admin users must be able to create new employee/candidate records with all masterdata fields including name, SSN, email, phone, rank, gender, hiring date, termination date, and other HR-controlled attributes.

**FR4:** HR Admin users must be able to edit all masterdata fields for existing employee/candidate records with changes persisted immediately.

**FR5:** HR Admin users must be able to archive (soft delete) employee records, making them invisible in the main view but recoverable if needed.

**FR5a:** HR Admin users must be able to mark employees as "Terminated/Drop out" with termination date and reason comment, distinguishing them from active employees while retaining full record history.

**FR5b:** HR Admin users must be able to bulk import employee masterdata from CSV files with column mapping to populate the database from existing Excel data.

**FR5c:** HR Admin users must be able to maintain a reference calendar of important operational dates (e.g., Stena dates, ÖMC dates by week) visible to all users for scheduling coordination.

**FR6:** The system must provide a unified spreadsheet-like table interface as the primary view for all users displaying employee records with role-based column visibility.

**FR7:** The table interface must visually distinguish between read-only masterdata columns and editable custom columns through clear visual indicators (e.g., background color, icons, or borders).

**FR8:** External party users (Sodexo, ÖMC, Payroll, Toplux) must be able to view specific masterdata fields (determined by HR configuration) as read-only reference data.

**FR9:** HR Admin must be able to create and manage custom data columns for external parties (Sodexo, ÖMC, Payroll, Toplux) through the Column Settings interface, with each column assigned to specific roles and linked to employee records.

**FR10:** HR Admin must be able to organize custom columns into logical categories (e.g., "Recruitment Team", "Warehouse Team") for better workflow organization.

**FR11:** Changes to masterdata fields by HR Admin must automatically propagate to all external party views in real-time (visible within 2 seconds) without requiring page refresh.

**FR12:** The system must enforce complete data isolation between external parties so that each party can only view and edit their own custom columns, not those of other parties.

**FR13:** HR Admin must be able to configure column-level permissions specifying which roles can view (read-only) and which can edit specific columns through an admin configuration interface.

**FR14:** HR Admin must be able to create new columns, assign them to specific roles, and define whether they are read-only or editable for those roles.

**FR15:** HR Admin must have a "View As" preview mode allowing them to see exactly what each role (Sodexo, ÖMC, Payroll, Toplux) sees in their table interface to verify permissions are configured correctly.

**FR16:** The table interface must provide text-based search functionality that searches across all visible columns for the current user's role.

**FR17:** The table interface must support click-to-sort on any column header with toggle between ascending and descending order.

**FR18:** The table interface must display archived employees separately or hide them by default with an option to view archived records.

**FR19:** The system must support responsive design optimized for desktop browsers (Chrome, Firefox, Edge, Safari - last 2 versions).

**FR20:** All data changes (create, update, archive) must be persisted immediately to the database with appropriate error handling and user feedback on success or failure.

---

## FR Coverage Map

**Note:** Existing epics (1-5) from PRD cover FR1-FR18 and FR20. FR19 (responsive design) is partially addressed by Story 9.1, but requires a dedicated epic for comprehensive mobile enhancements.

---

## Epic Structure Proposal

### Epic 12: Mobile Experience Enhancement

**Epic Goal:** Enhance the mobile user experience with advanced interactions, performance optimizations, and mobile-specific features that go beyond basic responsive design. This epic builds upon the foundation established in Story 9.1 (Mobile Responsive Design) to deliver a polished, native-feeling mobile experience that enables users to efficiently complete all core workflows on mobile devices.

**FR Coverage:** 
- **FR19:** Comprehensive mobile responsive design (enhanced beyond basic implementation)
- Supports all existing FRs (FR1-FR18, FR20) with mobile-optimized workflows

**Scope:**
- Advanced mobile interactions (gestures, pull-to-refresh, swipe actions)
- Mobile performance optimizations (offline support, caching strategies)
- Progressive Web App (PWA) features for app-like experience
- Mobile-specific UX enhancements (quick actions, shortcuts, mobile workflows)
- Enhanced mobile accessibility and usability testing

**Suggested Sequencing:** This epic can be executed in parallel with other work or as a focused sprint after core MVP features are stable. It enhances rather than blocks existing functionality.

**Why This Grouping Makes Sense:**
- Mobile experience is a cohesive capability area that spans multiple functional requirements
- Stories naturally cluster around mobile-specific technical patterns (PWA, offline, gestures)
- Can be delivered incrementally without disrupting desktop experience
- Builds upon existing mobile foundation (Story 9.1) rather than duplicating work

**Test Organization Requirements:**
- All new tests created for Epic 12 stories must be organized in folders named for the epic and story number
- Test folder structure: `tests/{test-type}/epic-12/story-12.X/` (e.g., `tests/unit/epic-12/story-12.1/`, `tests/integration/epic-12/story-12.1/`, `tests/e2e/epic-12/story-12.1/`)
- This organization ensures that when multiple developers work on different stories and push code/tests, it's easy to identify which tests belong to which story
- If tests fail, developers can quickly locate and fix tests related to their specific story

---

## Epic 12: Mobile Experience Enhancement

**Epic Goal:** Enhance the mobile user experience with advanced interactions, performance optimizations, and mobile-specific features that go beyond basic responsive design. This epic builds upon the foundation established in Story 9.1 (Mobile Responsive Design) to deliver a polished, native-feeling mobile experience that enables users to efficiently complete all core workflows on mobile devices.

### Story 12.1: Pull-to-Refresh Data Synchronization

**As a** mobile user,  
**I want** to pull down on the employee list to refresh data,  
**so that** I can quickly sync the latest employee information without navigating away or using a refresh button.

**Acceptance Criteria:**

**Given** I am viewing the employee table/card list on a mobile device (< 1024px width)  
**When** I pull down from the top of the list with a downward swipe gesture  
**Then** a loading spinner appears at the top of the list  
**And** the application fetches the latest employee data from the API  
**And** the list updates with any new or modified employee records  
**And** a brief success indicator (toast or visual feedback) confirms the refresh completed  
**And** the pull gesture feels natural and responsive (no lag or jank)

**Given** I am on a desktop device (≥ 1024px width)  
**When** I attempt to pull-to-refresh  
**Then** the gesture is ignored (desktop uses standard refresh button or auto-refresh)

**Given** I am pulling to refresh but my network connection is slow or unavailable  
**When** the refresh request fails or times out  
**Then** an error message displays: "Unable to refresh. Please check your connection and try again."  
**And** the list remains in its previous state (no data loss)

**Prerequisites:** Story 9.1 (Mobile Responsive Design) - Employee card list component must exist

**Technical Notes:**
- Implement using touch event handlers (touchstart, touchmove, touchend) or a library like react-pull-to-refresh
- Minimum pull distance: 80px to trigger refresh
- Visual feedback: Show pull distance indicator (rubber-band effect)
- Debounce refresh requests (prevent multiple simultaneous refreshes)
- Integrate with existing Supabase real-time subscriptions (refresh supplements, doesn't replace)
- Test on iOS Safari and Android Chrome (gesture behavior varies by browser)

---

### Story 12.2: Swipe Gestures for Row Actions

**As a** mobile user,  
**I want** to swipe left on an employee card to reveal quick actions (archive, terminate, edit),  
**so that** I can perform common actions efficiently without opening menus or modals.

**Acceptance Criteria:**

**Given** I am viewing an employee card on a mobile device  
**When** I swipe left on the card  
**Then** the card slides left to reveal action buttons (Archive, Terminate, Edit)  
**And** the swipe gesture feels smooth and responsive (60fps animation)  
**And** the card returns to original position if I swipe right or tap outside

**Given** I have swiped to reveal actions  
**When** I tap the "Archive" button  
**Then** the standard archive confirmation dialog appears  
**And** after confirmation, the employee is archived and the card is removed from view

**Given** I have swiped to reveal actions  
**When** I tap the "Edit" button  
**Then** the edit modal opens with the employee's current data pre-filled

**Given** I am on a desktop device  
**When** I attempt to swipe on a table row  
**Then** the gesture is ignored (desktop uses dropdown menu actions)

**Given** I am swiping but accidentally trigger a page scroll  
**When** my swipe gesture is ambiguous (both horizontal and vertical movement)  
**Then** the system prioritizes vertical scroll (prevents accidental action triggers)

**Prerequisites:** Story 9.1 (Mobile Responsive Design) - Employee card component must exist

**Technical Notes:**
- Implement swipe detection using touch events with threshold: minimum 50px horizontal movement, maximum 30px vertical movement
- Use CSS transforms for smooth animation (translateX)
- Action buttons: 80px width, touch-optimized (44px height minimum)
- Prevent default scroll behavior during horizontal swipe
- Add haptic feedback on iOS (if available) when actions are revealed
- Test on real devices (emulators don't capture gesture feel accurately)

---

### Story 12.3: Offline Support with Local Caching

**As a** mobile user,  
**I want** the application to work when I have poor or no network connection,  
**so that** I can view employee data and queue edits for sync when connectivity is restored.

**Acceptance Criteria:**

**Given** I have previously loaded the employee list while online  
**When** my network connection is lost or becomes unavailable  
**Then** the application displays a "Offline Mode" banner at the top  
**And** I can still view the cached employee list (last successful fetch)  
**And** I can search and sort the cached data (client-side operations)

**Given** I am in offline mode  
**When** I attempt to edit an employee record  
**Then** the edit is saved to local storage (IndexedDB or localStorage)  
**And** a visual indicator shows "Pending Sync" on the edited record  
**And** the edit appears in my view immediately (optimistic UI)

**Given** I have made edits while offline  
**When** my network connection is restored  
**Then** the application automatically detects connectivity  
**And** queued edits are synced to the server in the order they were made  
**And** a success message confirms: "X pending changes synced successfully"  
**And** if a conflict occurs (server data changed while offline), a conflict resolution dialog appears

**Given** I am in offline mode  
**When** I attempt to create a new employee  
**Then** the form allows data entry  
**And** the new employee is saved locally with a temporary ID  
**And** after sync, the temporary ID is replaced with the server-assigned ID

**Given** I am viewing cached data  
**When** the cache is older than 24 hours  
**Then** a warning message displays: "Data may be outdated. Connect to refresh."

**Prerequisites:** Story 2.1 (Employee List Table View) - Employee data fetching must be implemented

**Technical Notes:**
- Use Service Worker for network interception and caching (see Story 6.4)
- Store cached employee data in IndexedDB (structured data, larger capacity than localStorage)
- Queue mutations in IndexedDB with timestamp and operation type (create, update, delete)
- Implement conflict resolution strategy: last-write-wins with user notification
- Use Network Information API to detect connectivity changes
- Cache TTL: 24 hours for employee list, 1 hour for individual employee details
- Test offline scenarios: airplane mode, poor 3G connection, intermittent connectivity

---

### Story 12.4: Progressive Web App (PWA) Installation and Service Worker

**As a** mobile user,  
**I want** to install the HR Masterdata app on my home screen and use it like a native app,  
**so that** I can access it quickly without opening a browser and enjoy app-like performance.

**Acceptance Criteria:**

**Given** I am accessing the application on a mobile device (iOS Safari, Android Chrome)  
**When** I meet the PWA installation criteria (visited site 2+ times, spent 30+ seconds)  
**Then** an install prompt appears: "Install HR Masterdata App" with app icon and description  
**And** tapping "Install" adds the app to my home screen  
**And** the installed app opens in standalone mode (no browser UI)

**Given** I have installed the PWA  
**When** I launch the app from my home screen  
**Then** it opens immediately with a splash screen showing the Stena Line logo  
**And** the app loads faster than browser access (cached assets)  
**And** navigation feels native (smooth page transitions, no browser chrome)

**Given** the application has a Service Worker registered  
**When** I visit the application  
**Then** static assets (CSS, JS, images) are cached for offline access  
**And** API responses are cached with appropriate TTL (employee list: 5 minutes, individual records: 1 minute)  
**And** subsequent page loads are faster (served from cache when appropriate)

**Given** a new version of the application is deployed  
**When** I open the app and a new Service Worker is available  
**Then** the new version is downloaded in the background  
**And** after the current page session ends, the new version activates  
**And** a toast notification informs me: "App updated. Refresh to see changes."

**Prerequisites:** Story 1.1 (Project Initialization) - Next.js project must be set up

**Technical Notes:**
- Use next-pwa package or manual Service Worker implementation
- Create manifest.json with app name, icons (192x192, 512x512), theme colors, display mode: "standalone"
- Service Worker caching strategy: NetworkFirst for API calls, CacheFirst for static assets
- Implement cache versioning for updates (increment version on deploy)
- Test PWA installation on iOS 16.4+ (supports Add to Home Screen) and Android (Chrome, Samsung Internet)
- Icons must follow platform guidelines (iOS: no transparency, Android: adaptive icons supported)

---

### Story 12.5: Mobile Performance Optimizations

**As a** mobile user,  
**I want** the application to load quickly and perform smoothly on mobile networks,  
**so that** I can use it efficiently even on slower connections or older devices.

**Acceptance Criteria:**

**Given** I am accessing the application on a 4G mobile network  
**When** I load the dashboard for the first time  
**Then** the initial page load completes in under 3 seconds  
**And** the First Contentful Paint (FCP) occurs within 1.5 seconds  
**And** the Time to Interactive (TTI) is under 3.5 seconds

**Given** I am on a mobile device  
**When** I scroll through the employee card list  
**Then** scrolling is smooth at 60fps (no jank or stuttering)  
**And** images load lazily as they enter the viewport (not all at once)  
**And** the list supports virtual scrolling if it exceeds 100 cards (only render visible items)

**Given** I am on a slow 3G connection  
**When** I navigate between pages  
**Then** loading skeletons appear immediately (perceived performance)  
**And** critical content loads first (above-the-fold)  
**And** non-critical content (admin panels, tooltips) loads progressively

**Given** the application bundle size  
**When** I check the initial JavaScript bundle  
**Then** the First Load JS is under 200KB (gzipped)  
**And** route-based code splitting ensures only necessary code loads per page  
**And** large dependencies (e.g., date picker library) are lazy-loaded

**Given** I am viewing images in the application  
**When** images are displayed  
**Then** they are served in WebP format (with fallback to JPEG/PNG)  
**And** responsive image sizes are used (srcset with 1x, 2x, 3x densities)  
**And** images are compressed and optimized (target: <100KB per image)

**Prerequisites:** Story 9.1 (Mobile Responsive Design) - Basic mobile components must exist

**Technical Notes:**
- Use Next.js Image component for automatic optimization (WebP, responsive sizes)
- Implement route-based code splitting (Next.js App Router handles this automatically)
- Lazy load heavy components: `next/dynamic` for admin panels, modals, date pickers
- Use React.memo for expensive list items (employee cards) to prevent unnecessary re-renders
- Implement virtual scrolling for large lists: react-window or tanstack-virtual
- Monitor bundle size with `next build --analyze` (bundle analyzer)
- Target Lighthouse mobile performance score: 80+ (currently may be lower, optimize incrementally)
- Test on real devices: iPhone SE (older device), mid-range Android (performance baseline)

---

### Story 12.6: Mobile Quick Actions and Shortcuts

**As a** mobile user,  
**I want** quick access to common actions without navigating through multiple screens,  
**so that** I can complete frequent tasks efficiently on mobile devices.

**Acceptance Criteria:**

**Given** I am on the employee list view on mobile  
**When** I long-press (hold for 500ms) on an employee card  
**Then** a context menu appears with quick actions: "Edit", "Archive", "View Details", "Call" (if phone number exists)  
**And** tapping an action executes it immediately  
**And** the context menu closes automatically after selection

**Given** I am viewing an employee card  
**When** the employee has an email address  
**Then** tapping the email opens my default email app with a new message to that address  
**And** the subject line is pre-filled: "Re: [Employee Name]"

**Given** I am viewing an employee card  
**When** the employee has a phone number  
**Then** tapping the phone number opens my phone dialer with the number pre-filled  
**And** on iOS, a "Call" button appears with native styling

**Given** I am on the dashboard  
**When** I am an HR Admin  
**Then** a floating action button (FAB) appears in the bottom-right corner  
**And** tapping the FAB opens a menu: "Add Employee", "Import CSV", "Quick Search"  
**And** the FAB is always visible when scrolling (fixed position)

**Given** I am searching for employees  
**When** I type in the search box on mobile  
**Then** search results appear as I type (debounced: 300ms delay)  
**And** the mobile keyboard includes a "Search" button that submits the query  
**And** search history is saved locally (last 5 searches) for quick re-searching

**Prerequisites:** Story 2.1 (Employee List Table View), Story 2.2 (Create New Employee Record)

**Technical Notes:**
- Implement long-press using touch events: touchstart timer (500ms), touchend cancels if moved
- Use `tel:` and `mailto:` links for native app integration (phone, email)
- FAB component: Material Design style, 56px diameter, elevation shadow, smooth animation
- Search debouncing: use lodash.debounce or custom hook (useDebounce)
- Store search history in localStorage (simple array, max 5 items)
- Test native link behavior on iOS and Android (varies by device and default apps)

---

### Story 12.7: Enhanced Mobile Accessibility and Usability Testing

**As a** mobile user with accessibility needs,  
**I want** the mobile application to be fully accessible via screen readers and assistive technologies,  
**so that** I can use all features regardless of my abilities or device limitations.

**Acceptance Criteria:**

**Given** I am using VoiceOver on iOS or TalkBack on Android  
**When** I navigate through the employee list  
**Then** each employee card is announced with name, role, and status  
**And** interactive elements (buttons, links) have descriptive labels  
**And** swipe gestures work with screen reader navigation (swipe right to next, left to previous)

**Given** I am using a screen reader  
**When** I interact with form fields  
**Then** field labels are properly associated (using `aria-label` or `<label>` elements)  
**And** validation errors are announced immediately when they occur  
**And** required fields are indicated both visually and audibly

**Given** I have limited dexterity or use assistive touch  
**When** I interact with buttons and controls  
**Then** all touch targets meet the 44x44px minimum (WCAG 2.1 AA)  
**And** there is adequate spacing (8px minimum) between interactive elements  
**And** I can adjust touch target sizes via system accessibility settings

**Given** I am testing the mobile application  
**When** I run automated accessibility audits  
**Then** Lighthouse accessibility score is 90+ on mobile  
**And** no critical ARIA errors are detected  
**And** color contrast ratios meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)

**Given** I am conducting usability testing with real mobile users  
**When** users complete core workflows (view employee, edit data, search)  
**Then** task completion rate is 90%+ (users successfully complete tasks)  
**And** average task time is comparable to desktop (within 20% variance)  
**And** user satisfaction score is 4+ out of 5

**Prerequisites:** Story 9.1 (Mobile Responsive Design) - Basic mobile components must exist

**Technical Notes:**
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<article>`) instead of divs with onClick
- Implement ARIA landmarks: `<nav aria-label="Main navigation">`, `<main aria-label="Employee list">`
- Test with real screen readers: VoiceOver (iOS), TalkBack (Android), NVDA (Windows, if testing in browser)
- Use axe DevTools or WAVE for automated accessibility testing
- Document accessibility features in user guide
- Conduct usability testing with 5-8 users (Nielsen's recommendation for qualitative testing)
- Test on real devices with accessibility features enabled (not just emulators)

---

## FR Coverage Matrix

| FR | Description | Epic Coverage | Story Coverage |
|---|---|---|---|
| FR1 | Secure login interface | Epic 1 | Story 1.3 |
| FR2 | User account management | Epic 1, Epic 5 | Story 1.2, Story 5.1 |
| FR3 | Create employee records | Epic 2 | Story 2.2 |
| FR4 | Edit employee masterdata | Epic 2 | Story 2.3 |
| FR5 | Archive employees | Epic 2 | Story 2.4 |
| FR5a | Mark terminated | Epic 2 | Story 2.5 |
| FR5b | CSV import | Epic 2 | Story 2.6 |
| FR5c | Important dates calendar | Epic 2 | Story 2.8 |
| FR6 | Spreadsheet-like table | Epic 2, Epic 3 | Story 2.1, Story 3.2 |
| FR7 | Visual column indicators | Epic 3 | Story 3.3 |
| FR8 | External party read-only views | Epic 3 | Story 3.4 |
| FR9 | Custom column management | Epic 4 | Story 4.2 |
| FR10 | Column categories | Epic 4 | Story 4.4 |
| FR11 | Real-time sync | Epic 4 | Story 4.5 |
| FR12 | Data isolation | Epic 4 | Story 4.3 |
| FR13 | Column permissions | Epic 5 | Story 5.2 |
| FR14 | Create columns | Epic 4 | Story 4.2 |
| FR15 | View As preview | Epic 5 | Story 5.3 |
| FR16 | Search functionality | Epic 2 | Story 2.7 |
| FR17 | Column sorting | Epic 2 | Story 2.7 |
| FR18 | Archived employee view | Epic 2 | Story 2.4 |
| **FR19** | **Responsive design** | **Epic 12** | **Stories 12.1-12.9 (enhanced mobile experience)** |
| FR20 | Data persistence | Epic 2 | Story 2.2, Story 2.3 |

**Note:** Epic 12 (Mobile Experience Enhancement) specifically addresses FR19 with comprehensive mobile features. All other FRs are supported on mobile through the responsive design foundation (Story 9.1) and enhanced by Epic 12 stories.

---

### Story 12.8: Enhanced Mobile Employee Card with Always-Visible Fields

**As a** mobile user,  
**I want** to see and edit key employee information (name, rank, city, and important dates) directly in the employee card without expanding,  
**so that** I can quickly view and update the most important fields without clicking "More".

**Acceptance Criteria:**

**Given** I am viewing an employee card on a mobile device (< 1024px width)  
**When** the card is displayed (not expanded)  
**Then** the card always shows the following fields inline-editable:
- First Name (always visible, inline-editable)
- Surname (always visible, inline-editable)
- Rank (always visible, inline-editable with dropdown: SEV, CHEF)
- City/Town District (always visible, inline-editable)
- Stena Date (always visible, inline-editable with date picker)
- ÖMC Date (always visible, inline-editable with date picker)
- PE3 Date (always visible, inline-editable with date picker)

**Given** I am viewing an employee card on mobile  
**When** I click "More" to expand the card  
**Then** all additional fields from column_config are displayed  
**And** the fields shown in the always-visible section (First Name, Surname, Rank, City, Stena Date, ÖMC Date, PE3 Date) are NOT duplicated in the expanded section  
**And** all fields in the expanded section are visible and inline-editable  
**And** a "Less" button appears at the top of the card (in CardHeader) that collapses the card back to the always-visible state

**Given** I am editing a field in the always-visible section on mobile  
**When** I tap on a text field (First Name, Surname, City)  
**Then** the mobile keyboard opens with appropriate input type (text keyboard for names, no special keyboard for city)

**Given** I am editing a field in the always-visible section on mobile  
**When** I tap on Rank field  
**Then** a dropdown/select menu opens with options: SEV, CHEF  
**And** the dropdown is mobile-optimized (large touch targets, easy to select)

**Given** I am editing a date field (Stena Date, ÖMC Date, PE3 Date) in the always-visible section on mobile  
**When** I tap on the date field  
**Then** a native mobile date picker opens (iOS: native date picker, Android: native date picker)  
**And** the date picker allows selection of dates from the important_dates table for that category  
**And** the date picker shows remaining spots in parentheses for each date option (e.g., "8-9 mars (5 spots left)")

**Given** I am viewing an employee card on mobile  
**When** the card is NOT expanded (always-visible state)  
**Then** Archive and Delete buttons are hidden (not visible in CardFooter)

**Given** I am viewing an employee card on mobile as HR Admin  
**When** I click "More" to expand the card  
**Then** Archive and Delete buttons appear in the CardFooter  
**And** the buttons are touch-optimized (44px minimum height)  
**And** clicking Archive shows the standard archive confirmation dialog  
**And** clicking Delete (if implemented) shows the standard delete confirmation dialog

**Given** I am viewing an employee card on mobile  
**When** I click "More" to expand  
**Then** a "Less" button appears at the top of the card (in CardHeader, next to employee name or in a prominent position)  
**And** clicking "Less" collapses the card back to always-visible state  
**And** the "Less" button is easily accessible (not hidden, clear visual indicator)

**Prerequisites:** Story 9.1 (Mobile Responsive Design) - Employee card component must exist, Story 2.1 (Employee List Table View)

**Technical Notes:**
- Modify `src/components/dashboard/employee-card.tsx` to:
  - Always show First Name, Surname, Rank, City (town_district), Stena Date, ÖMC Date, PE3 Date in CardContent (not in expanded section)
  - Filter out these fields from the expanded section (prevent duplication)
  - Add "Less" button in CardHeader when expanded
  - Conditionally show Archive/Delete buttons only when expanded
  - Use EditableCell component for inline editing with proper mobile input types
  - For date fields, use EditableDateCell component (already exists) which handles important_dates integration
  - For Rank dropdown, ensure select options are properly configured
- Mobile input optimization:
  - Text fields: `inputMode="text"` (no special keyboard)
  - Date fields: `type="date"` triggers native date picker on mobile
  - Select fields: Use shadcn/ui Select component with mobile-optimized styling
- Test on real iOS and Android devices to verify native pickers work correctly

**Testing Requirements:**
- Unit tests: Verify always-visible fields are displayed and not duplicated in expanded section
- Unit tests: Verify Archive/Delete buttons only show when expanded
- Unit tests: Verify "Less" button appears when expanded and collapses card
- Integration tests: Verify inline editing works for all always-visible fields
- Integration tests: Verify date pickers open correctly on mobile devices
- Integration tests: Verify dropdown opens correctly for Rank field
- E2E tests: Verify complete workflow: view card → edit field → expand → see all fields → collapse
- E2E tests: Verify Archive/Delete workflow: expand card → see buttons → click archive → confirm

---

### Story 12.9: Mobile Header and Navigation UI Improvements

**As a** mobile user,  
**I want** to see my name in the header and have a branded navigation menu,  
**so that** I can easily identify my session and feel the application is properly branded.

**Acceptance Criteria:**

**Given** I am logged in and viewing the application on a mobile device (< 1024px width)  
**When** I look at the header  
**Then** my user name (or email if name not available) is displayed to the left of the logout button  
**And** the user name is visible and readable (appropriate font size, not truncated unnecessarily)  
**And** the user name appears only on mobile (hidden on desktop where email is already shown)

**Given** I am on a mobile device  
**When** I open the side panel navigation menu (hamburger menu)  
**Then** instead of "Navigation" as the SheetTitle, the header shows:
- Stena Line logo (same logo used in main header)
- Text: "Säsongsrekrytering 2026"  
**And** the logo and text are properly styled and centered/aligned  
**And** the branding is consistent with the main header

**Prerequisites:** Story 9.1 (Mobile Responsive Design) - Mobile navigation and header components must exist

**Technical Notes:**
- Modify `src/components/layout/header.tsx`:
  - Add user name display to the left of logout button on mobile only
  - Use conditional rendering: `className="lg:hidden"` for mobile-only user name
  - Display user.email or user.name (if available) with appropriate truncation
- Modify `src/components/layout/mobile-nav.tsx`:
  - Replace SheetTitle "Navigation" with Stena Line logo and "Säsongsrekrytering 2026"
  - Use Image component for logo (same source as header: `/images/stena-logo.png`)
  - Style appropriately (centered, proper spacing)
- No tests required for these UI-only changes (as specified by user)

---

## Summary

**Epic Breakdown Complete (Initial Version)**

**Created:** epics.md with Epic 12 (Mobile Experience Enhancement) breakdown

**FR Coverage:** All functional requirements from PRD mapped to epics. FR19 (responsive design) comprehensively covered by Epic 12 with 9 detailed stories.

**Epic 12 Stories:**
1. Story 12.1: Pull-to-Refresh Data Synchronization
2. Story 12.2: Swipe Gestures for Row Actions
3. Story 12.3: Offline Support with Local Caching
4. Story 12.4: Progressive Web App (PWA) Installation and Service Worker
5. Story 12.5: Mobile Performance Optimizations
6. Story 12.6: Mobile Quick Actions and Shortcuts
7. Story 12.7: Enhanced Mobile Accessibility and Usability Testing
8. Story 12.8: Enhanced Mobile Employee Card with Always-Visible Fields
9. Story 12.9: Mobile Header and Navigation UI Improvements

**Next Steps in BMad Method:**

1. **UX Design** (if UI exists) - Run: `workflow ux-design`
   → Will add interaction details to stories in epics.md

2. **Architecture** - Run: `workflow create-architecture`
   → Will add technical details to stories in epics.md

3. **Phase 4 Implementation** - Stories ready for context assembly

**Important:** This is a living document that will be updated as you progress through the workflow chain. The epics.md file will evolve with UX and Architecture inputs before implementation begins.

---

## Epic 13: Dashboard Filter, Selection, and Export Enhancements

**Epic Goal:** Fix filter checkbox functionality, implement employee row selection with visual feedback, enhance export capabilities with field selection, improve visual indicators for employee status, and streamline dashboard interactions. This epic addresses critical UX issues with filter checkboxes, adds powerful selection capabilities for bulk operations, and provides flexible export options that respect user selections and field visibility.

**FR Coverage:** 
- Enhances existing filter functionality (FR18 - archived/terminated display)
- Supports export workflows (extends existing export capabilities)
- Improves dashboard usability and visual feedback

**Scope:**
- Fix filter checkbox state management and view updates
- Implement employee row selection with checkboxes and click-to-select
- Add visual indicators (grey tint for selected, red for terminated, green for crew ready)
- Enhance export functionality with field selection and selected-employee-only export
- Implement crew ready filter auto-selection behavior
- Remove unused UI elements
- Optimize view refresh behavior
- Update header branding

**Suggested Sequencing:** This epic should be executed as a cohesive unit since stories build upon each other (selection → export, filters → visual indicators). Stories 13.1-13.3 establish foundation, 13.4-13.6 add selection and export, 13.7-13.12 polish and optimize.

**Why This Grouping Makes Sense:**
- All stories focus on dashboard interaction improvements
- Selection and export are tightly coupled (export uses selection)
- Visual indicators enhance the selection and filter experience
- Filter fixes enable proper selection behavior
- Stories naturally flow from foundation (fixes) → features (selection/export) → polish (visual indicators, optimizations)

**Test Organization Requirements:**
- All new tests created for Epic 13 stories must be organized in folders named for the epic and story number
- Test folder structure: `tests/{test-type}/epic-13/story-13.X/` (e.g., `tests/unit/epic-13/story-13.1/`, `tests/integration/epic-13/story-13.1/`, `tests/e2e/epic-13/story-13.1/`)
- This organization ensures that when multiple developers work on different stories and push code/tests, it's easy to identify which tests belong to which story
- If tests fail, developers can quickly locate and fix tests related to their specific story

---

### Story 13.1: Fix Filter Checkbox Functionality

**As a** HR Admin user,  
**I want** filter checkboxes (Show Archived, Show Terminated, Show Has Repayments) to properly update the view and show their checked state,  
**so that** I can reliably filter employee records and see which filters are active.

**Acceptance Criteria:**

**Given** I am on the dashboard viewing the employee table  
**When** I click the "Show Archived" checkbox  
**Then** the checkbox displays a checkmark  
**And** the view updates to show archived employees  
**And** archived employees are visible in the table

**Given** I have "Show Archived" checked  
**When** I click the "Show Archived" checkbox again to uncheck it  
**Then** the checkbox checkmark is removed  
**And** the view updates to hide archived employees  
**And** only non-archived employees are visible

**Given** I have "Show Terminated" checked  
**When** I click the "Show Has Repayments" checkbox  
**Then** the "Show Terminated" checkbox becomes unchecked  
**And** the view switches to show only employees with repayments  
**And** the "Show Has Repayments" checkbox shows a checkmark  
**And** terminated employees are no longer shown (unless they also have repayments)

**Given** I have "Show Has Repayments" checked  
**When** I click the "Show Terminated" checkbox  
**Then** the "Show Has Repayments" checkbox becomes unchecked  
**And** the view switches to show only terminated employees  
**And** the "Show Terminated" checkbox shows a checkmark  
**And** employees with repayments are no longer shown (unless they are also terminated)

**Given** I have a filter checkbox checked  
**When** I click a different filter checkbox  
**Then** the previously checked checkbox becomes unchecked  
**And** the view switches to the new filter (does not combine filters)  
**And** only the newly selected filter's checkbox shows a checkmark

**Given** no filter checkboxes are checked  
**When** I click a filter checkbox  
**Then** that checkbox shows a checkmark  
**And** the view updates to show filtered results  
**And** the filter is applied correctly

**Prerequisites:** Story 7.5 (Dashboard Filter & UX Improvements) - Filter checkboxes must exist in UI

**Technical Notes:**
- Filter checkboxes are in `src/components/dashboard/employee-table.tsx` (lines 814-856)
- Filter state is managed in `src/app/dashboard/page.tsx` via `includeArchived`, `includeTerminated`, `needsRepayment` state
- Checkbox handlers: `onIncludeArchivedChange`, `onIncludeTerminatedChange`, `onNeedsRepaymentChange`
- Ensure checkbox `checked` prop correctly reflects state
- Ensure handlers update both state AND trigger view refresh
- Filters should be mutually exclusive (only one active at a time)
- Verify `EmployeeTable` component receives and uses filter props correctly
- Check that employee query/fetch logic respects filter state changes

---

### Story 13.2: Add Employee Row Selection Checkboxes

**As a** HR Admin user,  
**I want** tiny checkboxes on the left side of each employee row (or in a logical position on mobile) that allow me to select employees,  
**so that** I can mark specific employees for bulk operations like export.

**Acceptance Criteria:**

**Given** I am viewing the employee table on desktop  
**When** I look at an employee row  
**Then** a small checkbox appears on the far left of the row  
**And** the checkbox is clearly visible but not intrusive  
**And** the checkbox is properly aligned with the row content

**Given** I am viewing the employee table on mobile (< 1024px width)  
**When** I look at an employee card/box  
**Then** a checkbox appears in a logical position (e.g., top-left corner of the card)  
**And** the checkbox is easily tappable (minimum 44x44px touch target)  
**And** the checkbox does not interfere with other card interactions

**Given** I see an employee row with an unchecked selection checkbox  
**When** I click the checkbox  
**Then** the checkbox becomes checked  
**And** the employee row receives a greyish tint background  
**And** the employee is marked as "selected" in the application state

**Given** I see an employee row with a checked selection checkbox  
**When** I click the checkbox again  
**Then** the checkbox becomes unchecked  
**And** the greyish tint is removed from the row  
**And** the employee is removed from the selected state

**Given** I have multiple employees selected  
**When** I view the table  
**Then** all selected employee rows show the greyish tint  
**And** all their checkboxes are checked  
**And** the selection state persists as I scroll or interact with the table

**Prerequisites:** Story 2.1 (Employee List Table View) - Employee table component must exist

**Technical Notes:**
- Add selection checkbox as first column in desktop table view
- For mobile card view, add checkbox to card header or top-left area
- Use React state to track selected employee IDs: `const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())`
- Apply greyish tint using Tailwind classes: `bg-gray-100 dark:bg-gray-800` or similar muted background
- Ensure checkbox component is accessible (proper ARIA labels, keyboard navigation)
- Selection state should persist during session (consider localStorage if needed)
- Checkbox should be small but visible: `w-4 h-4` or similar
- Position checkbox in first table column or card header area
- Test on both desktop table and mobile card layouts

---

### Story 13.3: Implement Row Click Selection

**As a** HR Admin user,  
**I want** to click anywhere on an employee row (except buttons or input fields) to select/deselect that employee,  
**so that** I can quickly select employees without needing to target a small checkbox.

**Acceptance Criteria:**

**Given** I am viewing an employee row that is not selected  
**When** I perform a single left click on the row (not on a button, not on an input field, not on a link)  
**Then** the row becomes selected  
**And** the row receives a greyish tint  
**And** the selection checkbox (if visible) becomes checked  
**And** the employee is added to the selected state

**Given** I am viewing an employee row that is already selected  
**When** I perform a single left click on the row (not on a button, not on an input field, not on a link)  
**Then** the row becomes unselected  
**And** the greyish tint is removed  
**And** the selection checkbox (if visible) becomes unchecked  
**And** the employee is removed from the selected state

**Given** I have multiple employees selected  
**When** I click on a different unselected employee row  
**Then** that new row becomes selected  
**And** previously selected rows remain selected  
**And** all selected rows show the greyish tint

**Given** I click on a button within an employee row (e.g., "Edit", "Archive", action menu)  
**When** the button click occurs  
**Then** the row selection does NOT change  
**And** the button's normal action executes (e.g., opens edit modal)

**Given** I click on an input field within an employee row (e.g., inline editable field)  
**When** the input field receives focus  
**Then** the row selection does NOT change  
**And** the input field behaves normally (allows editing)

**Given** I click on a link within an employee row  
**When** the link is clicked  
**Then** the row selection does NOT change  
**And** the link navigation occurs normally

**Given** I am on mobile viewing an employee card  
**When** I tap on the card (not on buttons or input fields)  
**Then** the card becomes selected with greyish tint  
**And** the selection checkbox (if visible) becomes checked

**Prerequisites:** Story 13.2 (Add Employee Row Selection Checkboxes) - Selection state management must exist

**Technical Notes:**
- Add click handler to `TableRow` component in `employee-table.tsx`
- Use event delegation to detect clicks on row vs. interactive elements
- Check `event.target` to determine if click is on button, input, or link
- Prevent row selection when clicking: buttons, input fields, links, dropdowns, action menus
- Use `onClick` handler that checks: `if (event.target.closest('button, input, a, [role="button"]')) return;`
- Ensure row click and checkbox click both update the same selection state
- Test with various interactive elements: edit buttons, action menus, inline editable fields, links
- Mobile: Apply same logic to employee card component
- Validate selection behavior works correctly with existing row interactions

---

### Story 13.4: Export Only Selected Employees

**As a** HR Admin user,  
**I want** all export operations to include only currently selected employees,  
**so that** I can export specific subsets of employees rather than all visible employees.

**Acceptance Criteria:**

**Given** I have selected 3 employees in the table  
**When** I trigger any export operation (e.g., "Export & Mark Crew Ready", general "Export" button)  
**Then** the exported CSV contains only those 3 selected employees  
**And** no other employees are included in the export

**Given** I have no employees selected  
**When** I trigger an export operation  
**Then** the export includes zero employees  
**And** a message displays: "No employees selected. Please select employees to export."  
**And** no CSV file is downloaded

**Given** I have selected 5 employees  
**When** I click "Export & Mark Crew Ready"  
**Then** only those 5 selected employees are exported  
**And** only those 5 employees are marked as `crewing_done = true`  
**And** other employees (even if they meet crew ready criteria) are not affected

**Given** I have selected employees and then unselect some of them  
**When** I trigger an export  
**Then** only currently selected employees are exported  
**And** previously selected but now unselected employees are not included

**Given** I have selected employees across multiple pages (if pagination exists)  
**When** I trigger an export  
**Then** all selected employees from all pages are included in the export

**Prerequisites:** 
- Story 13.2 (Add Employee Row Selection Checkboxes) - Selection state must exist
- Story 8.5 (Crewing/Done Field Conditional Logic) - Export functionality must exist

**Technical Notes:**
- Modify export API endpoints to accept `selectedEmployeeIds` array parameter
- Update `POST /api/employees/export-crew-ready` to filter by selected IDs
- Update any other export endpoints to respect selection
- Frontend: Pass `selectedEmployeeIds` to export API calls
- Backend: Filter employee queries to only include IDs in `selectedEmployeeIds`
- Validate: If `selectedEmployeeIds` is empty, return appropriate error message
- Ensure export respects selection even if filters change view
- Test with various selection scenarios: single employee, multiple employees, all employees, none selected

---

### Story 13.5: Crew Ready Filter Auto-Selection

**As a** HR Admin user,  
**I want** the "Crew Ready" filter to automatically select all matching employees when activated, and unselect all when deactivated or when another filter is chosen,  
**so that** I can quickly export all crew-ready employees without manual selection.

**Acceptance Criteria:**

**Given** I am on the dashboard with no filter active  
**When** I activate the "Crew Ready" filter  
**Then** all employees matching the crew ready criteria are automatically selected  
**And** all matching employee rows show the greyish tint  
**And** all matching employee checkboxes are checked  
**And** the employee count reflects the number of selected employees

**Given** I have the "Crew Ready" filter active with employees auto-selected  
**When** I click on any individual employee checkbox to uncheck it  
**Then** that specific employee becomes unselected  
**And** the "Crew Ready" filter remains active  
**And** other auto-selected employees remain selected

**Given** I have the "Crew Ready" filter active with employees auto-selected  
**When** I activate a different filter (e.g., "Show Terminated")  
**Then** all previously selected employees are automatically unselected  
**And** the "Crew Ready" filter is deactivated  
**And** the new filter becomes active  
**And** no employees are selected by default

**Given** I have the "Crew Ready" filter active  
**When** I click the "Crew Ready" filter again to deactivate it  
**Then** all auto-selected employees are automatically unselected  
**And** the filter is deactivated  
**And** the view returns to showing all employees (based on other active filters)

**Given** I activate the "Crew Ready" filter  
**When** the system determines which employees are crew ready  
**Then** crew ready criteria are: all boolean masterdata fields (except `hotel_required`) are `true`, and `loneiva` (salary level) enum field has a value set  
**And** only employees meeting ALL these criteria are selected

**Given** I create a new employee  
**When** the employee record is created  
**Then** the `loneiva` field is initialized as empty/null (no value set)  
**And** the employee does NOT meet crew ready criteria until `loneiva` is set

**Prerequisites:** 
- Story 13.2 (Add Employee Row Selection Checkboxes) - Selection functionality must exist
- Story 8.5 (Crewing/Done Field Conditional Logic) - Crew ready logic must exist

**Technical Notes:**
- Crew ready criteria: All boolean fields (except `hotel_required`) = `true` AND `loneiva` has value
- Boolean fields to check: `isps`, `photo`, `origo`, `mail_lon`, `bankuppgifter`, `li`, `passport`, `kvitto_c17_18`, `c17`
- Exclude `hotel_required` from crew ready criteria
- When "Crew Ready" filter activates: Query employees matching criteria, set `selectedEmployeeIds` to their IDs
- When "Crew Ready" filter deactivates or another filter activates: Clear `selectedEmployeeIds` (set to empty Set)
- Ensure `loneiva` field defaults to `null`/empty on employee creation (verify in `add-employee-modal.tsx` or employee creation logic)
- Update crew ready filter button/checkbox handler to trigger auto-selection
- Test crew ready criteria logic matches existing `canEditCrewingDone` function behavior
- Verify auto-selection works correctly with existing filters (archived, terminated)

---

### Story 13.6: General Export Button with Field Selection

**As a** HR Admin user,  
**I want** a general "Export" button that exports selected employees with a field selection dialog,  
**so that** I can customize which fields are included in the export based on what's currently visible or my specific needs.

**Acceptance Criteria:**

**Given** I have employees selected in the table  
**When** I click the general "Export" button  
**Then** a dialog/modal opens showing available fields to include in the export  
**And** by default, all currently visible columns in the table are pre-selected  
**And** I can check/uncheck fields to customize the export

**Given** I have the export field selection dialog open  
**When** I review the available fields  
**Then** I see all fields that can be exported (masterdata fields, custom columns, etc.)  
**And** currently visible columns are marked as selected  
**And** currently hidden columns are available but not selected by default

**Given** I have selected fields in the export dialog  
**When** I click "Export" in the dialog  
**Then** a CSV file is generated containing only the selected employees  
**And** the CSV includes only the fields I selected  
**And** the CSV file downloads automatically  
**And** the file is named appropriately (e.g., `employees_export_YYYY-MM-DD.csv`)

**Given** I have no employees selected  
**When** I click the general "Export" button  
**Then** a message displays: "No employees selected. Please select employees to export."  
**And** the field selection dialog does not open

**Given** I have employees selected and open the export dialog  
**When** I click "Cancel" in the dialog  
**Then** the dialog closes  
**And** no export occurs  
**And** employee selection remains unchanged

**Given** I export employees with custom field selection  
**When** I open the exported CSV file  
**Then** the CSV contains the correct headers matching my selected fields  
**And** the data rows contain values for only those selected fields  
**And** the field order matches the order I selected (or logical field grouping)

**Prerequisites:** 
- Story 13.2 (Add Employee Row Selection Checkboxes) - Selection must exist
- Story 13.4 (Export Only Selected Employees) - Selected-only export must exist

**Technical Notes:**
- Add "Export" button to dashboard toolbar (separate from "Export & Mark Crew Ready")
- Create export field selection dialog/modal component
- Default selection: Get currently visible columns from table state (`table.getVisibleColumns()` or similar)
- Available fields: Masterdata fields + custom columns from `columnConfigs`
- Field selection UI: Checkbox list or multi-select component
- Export API: `POST /api/employees/export` with body: `{ employeeIds: string[], fields: string[] }`
- CSV generation: Use existing CSV library (Papa.unparse or similar)
- Field ordering: Maintain logical order (masterdata first, then custom columns by category)
- Ensure export respects field visibility permissions (don't export fields user can't see)
- Test with various field combinations, empty selection, all fields selected

---

### Story 13.7: Write Comprehensive Export Tests

**As a** developer,  
**I want** comprehensive test coverage for all export functionality,  
**so that** future changes don't break exports and I can confidently refactor export code.

**Acceptance Criteria:**

**Given** I run the test suite  
**When** export tests execute  
**Then** tests cover: export with selected employees, export with field selection, export with no selection, export crew ready, export error handling  
**And** all export tests pass

**Given** I modify export functionality  
**When** I run the export tests  
**Then** tests immediately reveal if my changes broke existing export behavior  
**And** I can fix issues before deployment

**Test Coverage Requirements:**
- Unit tests for export service functions
- Integration tests for export API endpoints
- E2E tests for export user workflows
- Tests for: selected-employee-only export, field selection, crew ready export, error cases, empty selection handling

**Prerequisites:** 
- Story 13.4 (Export Only Selected Employees) - Export functionality must exist
- Story 13.6 (General Export Button with Field Selection) - Field selection must exist

**Technical Notes:**
- Create test files: `tests/integration/api/export-selected.test.ts`, `tests/e2e/export-workflow.spec.ts`
- Test scenarios:
  - Export with 0 selected employees (should show error)
  - Export with 1 selected employee
  - Export with multiple selected employees
  - Export with field selection (subset of fields)
  - Export with all fields selected
  - Export crew ready with selection
  - Export error handling (API failures, invalid data)
  - CSV format validation (headers, data rows, encoding)
- Use existing test patterns from `tests/integration/api/export-workflow.test.ts`
- Ensure tests are maintainable and clearly document expected behavior
- Add tests to CI/CD pipeline

---

### Story 13.8: Remove Kolumnsynlighet Button

**As a** HR Admin user,  
**I want** the unused "Kolumnsynlighet" (Column Visibility) button removed from the dashboard,  
**so that** the interface is cleaner and doesn't confuse users with non-functional elements.

**Acceptance Criteria:**

**Given** I am on the dashboard  
**When** I look at the dashboard interface  
**Then** the "Kolumnsynlighet" button is not visible  
**And** no column visibility button exists in that location

**Given** I previously used the "Kolumnsynlighet" button  
**When** I look for column visibility controls  
**Then** I find column visibility controls in the appropriate location (if they exist elsewhere)  
**And** the removed button's functionality (if any) is handled by other UI elements

**Prerequisites:** None (standalone cleanup task)

**Technical Notes:**
- Search codebase for "Kolumnsynlighet" button reference
- Remove button from dashboard component (likely in `src/app/dashboard/page.tsx` or toolbar component)
- Verify no functionality depends on this button
- Check if column visibility is handled elsewhere (e.g., in Column Settings modal)
- Remove any associated translation keys if not used elsewhere
- Test that dashboard still functions correctly after removal

---

### Story 13.9: Verify Repayment Fields Only Show for Terminated Employees

**As a** HR Admin user,  
**I want** repayment fields to only appear in the employee view when the employee is marked as terminated,  
**so that** repayment tracking is only visible when relevant.

**Acceptance Criteria:**

**Given** I am viewing an employee who is NOT terminated  
**When** I look at the employee record/view  
**Then** repayment fields (e.g., repayment amount, repayment date) are NOT visible  
**And** repayment columns do not appear in the table view for this employee

**Given** I am viewing an employee who IS terminated  
**When** I look at the employee record/view  
**Then** repayment fields ARE visible  
**And** repayment columns appear in the table view for this employee  
**And** I can view and edit repayment information

**Given** I have the "Show Terminated" filter active  
**When** I view the employee table  
**Then** terminated employees show repayment columns  
**And** non-terminated employees (if visible) do NOT show repayment columns

**Given** I mark an employee as terminated  
**When** the termination is saved  
**Then** repayment fields immediately become visible for that employee  
**And** repayment columns appear in the table view

**Given** I reactivate a terminated employee (remove termination)  
**When** the reactivation is saved  
**Then** repayment fields are hidden for that employee  
**And** repayment columns no longer appear in the table view

**Prerequisites:** Story 8.13 (Terminated Employee Repayment Tracking) - Repayment fields must exist

**Technical Notes:**
- Verify conditional column visibility logic in `employee-table.tsx`
- Repayment columns should only render when `employee.is_terminated === true`
- Check column filtering logic around line 425-437 in `employee-table.tsx` (repaymentColumns filter)
- Verify RLS policies on `column_config` table enforce visibility rules
- Test with various employee states: active, terminated, archived+terminated
- Ensure repayment fields are hidden in edit modal for non-terminated employees
- Verify repayment column visibility in Column Settings respects termination status

---

### Story 13.10: Prevent Unnecessary View Refreshes

**As a** HR Admin user,  
**I want** the view to only refresh when actual data changes occur,  
**so that** I don't experience unnecessary flickering or data reloading when I click without making changes.

**Acceptance Criteria:**

**Given** I click on an inline editable field in an employee row  
**When** I click somewhere else without changing the field value  
**Then** the view does NOT refresh  
**And** no API call is made to update the employee  
**And** the field returns to its original state (not in edit mode)

**Given** I click on an inline editable field and change its value  
**When** I click somewhere else  
**Then** the view refreshes to show the updated value  
**And** an API call is made to save the change  
**And** the updated data is displayed

**Given** I click somewhere on the dashboard (not on an input field)  
**When** no data values are actually changed  
**Then** the view does NOT refresh  
**And** no unnecessary API calls are made

**Given** I click on a button that doesn't modify employee data (e.g., "Search", filter checkbox)  
**When** the button action completes  
**Then** only the necessary view updates occur (e.g., filter results update)  
**And** no full table refresh happens unless data actually changed

**Given** I am editing an inline field  
**When** I press Escape to cancel editing  
**Then** the field value reverts to original  
**And** no API call is made  
**And** the view does NOT refresh

**Prerequisites:** Story 4.4 (Inline Editing for Masterdata Fields) - Inline editing must exist

**Technical Notes:**
- Implement change detection: Compare original value vs. current value before saving
- Only trigger save/refresh if value actually changed
- Use `onBlur` handler that checks: `if (newValue !== originalValue) { save(); } else { cancel(); }`
- Prevent default refresh behavior on clicks that don't modify data
- Review `handleMasterdataUpdate` and `handleCustomDataUpdate` in `employee-table.tsx`
- Add change detection utility if needed: `hasValueChanged(original, current) => boolean`
- Test with various field types: text, number, date, boolean, enum
- Ensure cancel behavior (Escape key, click away without change) doesn't trigger refresh
- Verify real-time updates from other users still work correctly (Supabase subscriptions)

---

### Story 13.11: Visual Indicators for Employee Status

**As a** HR Admin user,  
**I want** clear visual indicators (red tint for terminated, green tint for crew ready) on employee records,  
**so that** I can quickly identify employee status at a glance.

**Acceptance Criteria:**

**Given** I am viewing an employee who is marked as terminated  
**When** I look at the employee row (desktop) or card (mobile)  
**Then** the entire row/card has a red tint background  
**And** the red tint is clearly visible but doesn't make text unreadable  
**And** the red tint distinguishes terminated employees from others

**Given** I am viewing an employee who has `crewing_done = true`  
**When** I look at the employee row (desktop) or card (mobile)  
**Then** the entire row/card has a green tint background  
**And** the green tint is clearly visible but doesn't make text unreadable  
**And** the green tint distinguishes crew-ready employees from others

**Given** I am viewing an employee who is both terminated AND crew ready  
**When** I look at the employee row/card  
**Then** the red tint takes precedence (terminated status is more critical)  
**And** the employee shows red tint, not green

**Given** I am viewing an employee who is selected (has greyish tint) AND terminated  
**When** I look at the employee row/card  
**Then** the red tint is still visible (selection grey doesn't completely override status tint)  
**And** both visual indicators are apparent (e.g., red background with grey overlay, or red border with grey background)

**Given** I mark an employee as terminated  
**When** the change is saved  
**Then** the employee row/card immediately shows the red tint  
**And** the visual update is smooth (no flickering)

**Given** I mark an employee's Crewing/Done field as true  
**When** the change is saved  
**Then** the employee row/card immediately shows the green tint  
**And** the visual update is smooth

**Prerequisites:** 
- Story 8.5 (Crewing/Done Field Conditional Logic) - Crew ready status must exist
- Story 5.5 (Terminate Employee Functionality) - Termination status must exist

**Technical Notes:**
- Apply red tint: `bg-red-50 dark:bg-red-950/20` or similar (ensure text remains readable)
- Apply green tint: `bg-green-50/50 dark:bg-green-950/20` (existing in code around line 1105)
- Status tint priority: Terminated (red) > Crew Ready (green) > Normal
- Selection tint (grey) should combine with status tint (use opacity or border to show both)
- Update `TableRow` className logic in `employee-table.tsx` (around line 1102-1107)
- Ensure tints work in both light and dark mode
- Test visual contrast: Text must remain readable with tinted backgrounds
- Mobile: Apply same tints to employee card component
- Verify tints update in real-time when status changes

---

### Story 13.12: Update Header Text to "Säsongsrekrytering 2026"

**As a** user,  
**I want** the header to display "Säsongsrekrytering 2026" instead of "HR Masterdata",  
**so that** the application reflects the current seasonal recruitment context.

**Acceptance Criteria:**

**Given** I am viewing any page in the application  
**When** I look at the top header  
**Then** the header displays "Säsongsrekrytering 2026"  
**And** "HR Masterdata" is no longer displayed in the header

**Given** I view the application in different languages (if multi-language support exists)  
**When** I check the header text  
**Then** the header shows the appropriate translation or keeps "Säsongsrekrytering 2026" if it's a proper noun

**Prerequisites:** None (simple text change)

**Technical Notes:**
- Find header component (likely in `src/components/layout/` or similar)
- Search for "HR Masterdata" text in codebase
- Replace with "Säsongsrekrytering 2026"
- Check if text is in translation files (`messages/en.json`, `messages/sv.json`) and update if needed
- Verify header displays correctly on all pages
- Test responsive behavior (mobile header, desktop header)

---

### Story 13.13: Investigate and Fix Epic 13 Test Failures

**As a** developer working on Epic 13,  
**I want** all test failures introduced by Epic 13 implementations to be systematically investigated and resolved,  
**So that** I can ensure the test suite accurately reflects the current system behavior and catches real regressions.

**Acceptance Criteria:**

**Given** the complete test suite  
**When** all tests are executed  
**Then** a comprehensive inventory of failing tests is created with categorization:
- All failing tests identified with file path, test name, and error message
- Failures categorized by type:
  - **Type A**: Tests failing due to Epic 13 implementation changes (scope changed - tests need updating)
  - **Type B**: Tests failing due to bugs introduced by Epic 13 implementations (implementation needs fixing)
  - **Type C**: Tests failing due to infrastructure/setup issues (unrelated to Epic 13)
- Each failure linked to specific Epic 13 story(s) that may have caused it
- Failure count and percentage documented

**Given** a categorized list of test failures  
**When** investigating each failure  
**Then** root cause analysis is documented:
- For each Type A failure: Document what changed in scope/behavior and why test needs updating
- For each Type B failure: Document the bug introduced and how it breaks expected behavior
- For each Type C failure: Document the infrastructure issue and whether it's related to Epic 13
- Evidence provided for each determination (code references, behavior changes, etc.)

**Given** Type B failures (bugs introduced by Epic 13)  
**When** fixing the implementation  
**Then** all Type B failures are resolved:
- Implementation bugs are fixed to restore expected behavior
- Fixed implementations pass all related tests
- No new bugs introduced by fixes
- Changes documented in code comments or commit messages

**Given** Type A failures (tests need updating for new behavior)  
**When** updating tests  
**Then** all Type A failures are resolved:
- Tests updated to reflect new expected behavior from Epic 13 implementations
- Test assertions match current system behavior
- Test documentation/comments updated to explain new expectations
- Updated tests pass with current implementation

**Given** Type C failures (infrastructure/setup issues)  
**When** fixing infrastructure  
**Then** all Type C failures are resolved:
- Test setup/mocking issues fixed
- Infrastructure changes don't break other tests
- All tests can execute successfully

**Given** all fixes are complete  
**When** running the full test suite  
**Then** comprehensive verification is performed:
- All previously failing tests now pass
- No new test failures introduced
- Test execution report generated showing before/after status
- Summary document created explaining fixes applied

**Prerequisites:** 
- All Epic 13 stories (13.1-13.12) must be implemented
- Test suite must be executable

**Technical Notes:**
- Systematic approach: Execute tests → Categorize failures → Analyze root causes → Fix appropriately
- Decision framework: Determine if failure is scope change (Type A) vs. bug (Type B) by checking if new behavior matches Epic 13 requirements
- Common failure patterns: Selection-related, export-related, filter-related, visual indicators, header text, refresh behavior
- Files likely affected: `tests/unit/components/employee-table.test.tsx`, `tests/integration/api/export-*.test.ts`, `tests/e2e/employee-*.spec.ts`
- Create analysis documents: `docs/stories/13.13-test-failure-inventory.md`, `docs/stories/13.13-type-a-analysis.md`, `docs/stories/13.13-type-b-analysis.md`, `docs/stories/13.13-type-c-analysis.md`, `docs/stories/13.13-test-fix-summary.md`
- All tests must pass before marking story complete

---

**Epic 13 Story Summary:**

1. Story 13.1: Fix Filter Checkbox Functionality
2. Story 13.2: Add Employee Row Selection Checkboxes
3. Story 13.3: Implement Row Click Selection
4. Story 13.4: Export Only Selected Employees
5. Story 13.5: Crew Ready Filter Auto-Selection
6. Story 13.6: General Export Button with Field Selection
7. Story 13.7: Write Comprehensive Export Tests
8. Story 13.8: Remove Kolumnsynlighet Button
9. Story 13.9: Verify Repayment Fields Only Show for Terminated Employees
10. Story 13.10: Prevent Unnecessary View Refreshes
11. Story 13.11: Visual Indicators for Employee Status
12. Story 13.12: Update Header Text to "Säsongsrekrytering 2026"
13. Story 13.13: Investigate and Fix Epic 13 Test Failures

**Next Steps in BMad Method:**

1. **UX Design** (if UI changes needed) - Run: `workflow ux-design`
   → Will add interaction details to stories in epics.md

2. **Architecture** - Run: `workflow create-architecture`
   → Will add technical details to stories in epics.md

3. **Phase 4 Implementation** - Stories ready for context assembly

**Important:** This is a living document that will be updated as you progress through the workflow chain. The epics.md file will evolve with UX and Architecture inputs before implementation begins.

---

## Epic 15: Technical Debt Cleanup and Project Refactoring

**Epic Goal:** Perform a comprehensive cleanup of the codebase to remove redundancy, consolidate service logic, improve type safety, and eliminate unused assets. This epic addresses the accumulated technical debt from the rapid development phase to ensure the project is maintainable, performant, and "clean" for future iterations.

**FR Coverage:**
- NFR: Code Maintainability
- NFR: System Performance (via bundle size reduction)
- NFR: Code Quality (Type safety)

**Scope:**
- Removal of unused components, hooks, utils, and services
- Refactoring of overlapping service logic (e.g., column services)
- Strict type checking and linting fixes
- Dependency audit and removal of unused packages
- Cleanup of test suite organization
- Documentation updates to match current implementation

**Suggested Sequencing:** Start with the audit (15.1), then proceed to refactoring (15.2) and cleanup (15.3, 15.4). Test optimization (15.5) should follow refactoring to ensure tests match the new structure.

**Why This Grouping Makes Sense:**
- All stories are focused on "internal quality" rather than user-facing features.
- It's a "Spring Cleaning" epic that requires a holistic view of the codebase.
- Grouping these changes reduces the risk of regression in feature development by isolating the refactoring phase.

---

### Story 15.1: Audit and Remove Unused Code

**As a** developer,
**I want** to identify and remove unused code (components, hooks, utils, api routes),
**so that** the codebase remains lean and easier to navigate.

**Acceptance Criteria:**

**Given** the complete codebase
**When** I run an analysis (using tools like `ts-prune` or manual audit)
**Then** I identify files and exports that are never imported or used
**And** I delete these files/exports
**And** the application still builds and runs correctly (no regression)

**Given** unused `utils` files
**When** I review `src/utils`
**Then** I remove any utility functions that are duplicative or unused

**Given** legacy components (e.g., old versions of modals or tables)
**When** I identify them
**Then** they are removed from the repository

**Technical Notes:**
- Use tools: `npx ts-prune`, `npx unimported` to find unused files.
- Manually check `src/components` for "V1", "Old", or commented-out code blocks.
- Check `src/app/api` for unused routes.
- Verify removal doesn't break dynamic imports or reflection-based usage (though unlikely in this stack).

---

### Story 15.2: Service Layer Refactoring and Consolidation

**As a** developer,
**I want** to consolidate overlapping service logic (e.g., column services),
**so that** there is a single source of truth for business logic and reduced code duplication.

**Acceptance Criteria:**

**Given** multiple service files with similar responsibilities (e.g., `column-service.ts` vs `column-config-service.ts`)
**When** I refactor them
**Then** their functionality is merged into a logical structure (e.g., `services/columns/` or a single robust service)
**And** duplicate methods are removed
**And** all call sites are updated to use the new unified service

**Given** `admin-service.ts`
**When** I review its contents
**Then** I ensure it doesn't duplicate logic found in domain-specific services (e.g., `employee-service.ts`)
**And** move logic to domain services where appropriate

**Technical Notes:**
- Analyze `src/lib/services` for overlap.
- Focus on: Column management, Employee updates, Date handling.
- Ensure proper error handling and typing in the refactored services.
- Update unit tests to reflect service changes.

---

### Story 15.3: Type Safety and Linting Improvements

**As a** developer,
**I want** to fix type errors, remove `any` types, and address linting warnings,
**so that** the codebase is robust and self-documenting via types.

**Acceptance Criteria:**

**Given** the codebase
**When** I run `npm run lint` and `tsc --noEmit`
**Then** I see zero errors and reduced warnings
**And** explicit `any` usage is minimized (replaced with proper interfaces or `unknown`)

**Given** complex data structures (e.g., Employee, User)
**When** I inspect their usage
**Then** they are consistently typed across frontend and backend (API responses)

**Technical Notes:**
- focus on `src/types` definition correctness.
- Check for `// @ts-ignore` or `// eslint-disable` comments and try to resolve the underlying issue.
- Ensure Zod schemas (if used) match TypeScript interfaces.

---

### Story 15.4: Dependency Analysis and Cleanup

**As a** developer,
**I want** to remove unused npm packages and update critical dependencies,
**so that** the project bundle size is optimized and security vulnerabilities are minimized.

**Acceptance Criteria:**

**Given** `package.json`
**When** I analyze dependencies (using `npm audit`, `depcheck`)
**Then** unused packages are uninstalled
**And** `package-lock.json` is updated

**Technical Notes:**
- Use `npx depcheck` to find unused dependencies.
- Be careful with "dev dependencies" that might be used in scripts but not imported in code.
- Check for heavy libraries that can be replaced with lighter alternatives (e.g., date libraries, lodash functions).

---

### Story 15.5: Test Suite Optimization and Cleanup

**As a** developer,
**I want** to organize and clean up the test suite,
**so that** tests are reliable, fast, and easy to maintain.

**Acceptance Criteria:**

**Given** the `tests` directory
**When** I review the test files
**Then** I remove any tests for features that no longer exist
**And** I ensure test folder structure matches the new epic/story organization
**And** I resolve any flaky tests identified during the cleanup

**Technical Notes:**
- Check `tests/unit`, `tests/integration`, `tests/e2e`.
- Remove any `.skip` tests that are permanently obsolete.
- Consolidate test utils if duplicated.

---

### Story 15.6: Documentation Update and Cleanup

**As a** developer,
**I want** to update project documentation (README, architecture docs),
**so that** it accurately reflects the current state of the application after the cleanup.

**Acceptance Criteria:**

**Given** `README.md` and `docs/` folder
**When** I update them
**Then** obsolete instructions are removed
**And** architecture diagrams (if any) are updated to reflect service consolidation
**And** "Getting Started" guides are verified to work

**Technical Notes:**
- Review `docs/` for stale markdown files.
- Ensure `epics.md` structure is preserved but updated with this new epic.

---
