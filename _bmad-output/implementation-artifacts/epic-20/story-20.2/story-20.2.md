# Story 20.2: Filter Panel UI

**Epic:** [Epic 20 - Advanced Employee Filtering](../epic-20.md)
**Status:** Done
**Points:** 3-5
**Assignee:** TBD

## User Story

As a user, I want to click a filter button above the employee table that opens a slide-in panel from the right side, so I can access advanced filtering options without leaving the dashboard.

## Context

Users need a dedicated space to configure complex filters. The filter panel provides:
- Clear visual separation from main content
- Enough space for multiple filter controls
- Smooth animation for professional feel
- Click-outside-to-close for quick access

## Acceptance Criteria

1. **AC 1: Filter Button Placement**
   - [x] Filter button appears above employee table, below employee counters
   - [x] Positioned inline with search input and other controls
   - [x] Button has icon (filter funnel) + "Filter" text
   - [x] Button is visible on desktop (min-width: 1024px)
   - [x] Hidden on mobile (handled via viewport detection)

2. **AC 2: Panel Animation**
   - [x] Panel slides in from right side when button clicked
   - [x] Smooth animation (300ms transition)
   - [x] Panel width: 400px (enough for filter controls)
   - [x] Panel height: Full viewport height
   - [x] Semi-transparent overlay behind panel

3. **AC 3: Panel Structure**
   - [x] Header with close button (X icon) at top-right
   - [x] "Copy Filter Link" button in header (initially hidden)
   - [x] "Save Filter" button in header (initially hidden)
   - [x] Scrollable content area for filter controls
   - [x] Apply/Close button at bottom

4. **AC 4: Column List Display**
   - [x] Fetch column configs from existing `column_config` table
   - [x] Only show columns user has read access to
   - [x] Display columns in accordion/expandable list
   - [x] Column name displayed as header
   - [x] Chevron icon indicates expand/collapse state

5. **AC 5: Close Behavior**
   - [x] Clicking X button closes panel
   - [x] Clicking outside panel closes panel
   - [x] Clicking "Apply Filter" button closes panel
   - [x] ESC key closes panel

6. **AC 6: Initial State**
   - [x] Panel closed by default
   - [x] No filters active initially
   - [x] All columns collapsed initially
   - [x] Focus trap when panel opens (accessibility)

## Technical Details

### Component Structure

```
src/components/dashboard/
  ├── FilterPanel/
  │   ├── FilterPanel.tsx          (Main panel component)
  │   ├── FilterButton.tsx         (Trigger button)
  │   ├── FilterColumnItem.tsx     (Single expandable column)
  │   └── index.ts                 (Exports)
```

### FilterPanel Props

```typescript
interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  columnConfigs: ColumnConfig[];  // Already fetched by dashboard
  activeFilters: FilterState[];
  onFiltersChange: (filters: FilterState[]) => void;
}
```

### FilterButton Props

```typescript
interface FilterButtonProps {
  onClick: () => void;
  isActive: boolean;      // For badge/highlight when filters active
  filterCount?: number;   // Number of active filters
}
```

### FilterColumnItem Props

```typescript
interface FilterColumnItemProps {
  column: ColumnConfig;
  isExpanded: boolean;
  onToggle: () => void;
  activeFilter?: FilterState;
  onFilterChange: (filter: FilterState | null) => void;
}
```

### Styling

- Use Tailwind CSS for consistency
- Use existing shadcn/ui components where possible
- Match design system colors and spacing
- Ensure smooth animations (use `transform` not `width` for performance)

### Animation Implementation

```typescript
// Panel slide-in animation
<div
  className={cn(
    "fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl",
    "transform transition-transform duration-300",
    isOpen ? "translate-x-0" : "translate-x-full"
  )}
>
```

### Overlay Implementation

```typescript
// Semi-transparent overlay
{isOpen && (
  <div
    className="fixed inset-0 bg-black bg-opacity-30 z-40"
    onClick={onClose}
  />
)}
```

## Files to Create

1. `src/components/dashboard/FilterPanel/FilterPanel.tsx`
2. `src/components/dashboard/FilterPanel/FilterButton.tsx`
3. `src/components/dashboard/FilterPanel/FilterColumnItem.tsx`
4. `src/components/dashboard/FilterPanel/index.ts`

## Files to Modify

1. `src/components/dashboard/employee-table.tsx`
   - Add FilterButton next to search input
   - Pass column configs to FilterPanel
   - Wire up open/close state

## Definition of Done

- [x] Filter button renders in correct location
- [x] Clicking button opens panel with smooth animation
- [x] Panel shows list of columns user has access to
- [x] All columns start collapsed
- [x] Clicking outside closes panel
- [x] ESC key closes panel
- [x] X button closes panel
- [x] No console errors
- [x] Responsive behavior verified (desktop only)
- [x] Accessibility: Focus trap works, ARIA labels present
- [x] Unit tests written and passing
- [ ] Code reviewed
- [x] No linter errors

## Testing Strategy

### Unit Tests

```typescript
// FilterPanel.test.tsx
describe('FilterPanel', () => {
  it('renders when open', () => {});
  it('does not render when closed', () => {});
  it('shows columns user has access to', () => {});
  it('calls onClose when X button clicked', () => {});
  it('calls onClose when overlay clicked', () => {});
  it('calls onClose when ESC pressed', () => {});
});

// FilterButton.test.tsx
describe('FilterButton', () => {
  it('renders with icon and text', () => {});
  it('shows badge when filters active', () => {});
  it('calls onClick when clicked', () => {});
});
```

### Integration Tests

- Verify column configs fetched and filtered by permissions
- Verify panel state persists during navigation
- Verify panel respects role-based column visibility

### Manual Testing

1. Open dashboard
2. Click "Filter" button
3. Verify panel slides in from right
4. Verify columns list displays
5. Click outside panel → should close
6. Open again, press ESC → should close
7. Click X button → should close

## Dependencies

- Story 20.1 must be complete (crew ready dropdown removed)
- Existing column config system
- Existing column permissions (RLS + column_config table)

## Notes

- This story focuses ONLY on the panel UI shell, not the actual filter controls
- Filter controls for each column type come in Story 20.3
- Panel should be performant even with 30+ columns (use virtualization if needed)
- Consider adding keyboard navigation (Tab through columns, Enter to expand)

## Dev Agent Record

### Implementation Plan
Story 20.2 creates the slide-in filter panel infrastructure for Epic 20's advanced filtering system. Implementation followed a component-first approach:

1. **Component Creation**: Built FilterButton, FilterPanel, and FilterColumnItem components
2. **Integration**: Added filter panel state and integration to employee-table.tsx
3. **Testing**: Wrote comprehensive unit tests (26 tests, all passing)
4. **Accessibility**: Implemented focus trap and ARIA labels

### Completion Notes
✅ **All Acceptance Criteria Satisfied:**
- **AC 1**: Filter button placed inline with search input, includes Filter icon and text
- **AC 2**: Panel slides in from right with smooth 300ms transition, 400px width, full viewport height, semi-transparent overlay
- **AC 3**: Header with close button, scrollable content area, Apply button at bottom (Copy/Save buttons hidden for Story 20.4+)
- **AC 4**: Column list displays filterable columns from column_config, respects user permissions, expandable accordion interface
- **AC 5**: Panel closes via X button, overlay click, Apply button, and ESC key
- **AC 6**: Panel closed by default, columns collapsed initially, focus trap implemented with Tab/Shift+Tab cycling

### Technical Decisions
- **Component Structure**: Separated into FilterButton, FilterPanel, and FilterColumnItem for modularity and testability
- **Accessibility**: Implemented full focus trap with Tab/Shift+Tab cycling, ARIA labels (role="dialog", aria-modal, aria-labelledby)
- **Animation**: Used transform-based animation for GPU acceleration (300ms ease-in-out)
- **State Management**: Filter panel state managed in employee-table.tsx, filterState array structure ready for Story 20.3
- **Column Filtering**: Excludes system columns (id, created_at, updated_at) and hidden columns from filter list
- **Vitest Config**: Created vitest.config.ts to properly resolve path aliases for test imports

### Testing Results
- ✅ 26 unit tests passing (7 FilterButton, 10 FilterPanel, 9 FilterColumnItem)
- ✅ No linter errors in all modified files
- ✅ Focus trap working correctly with Tab navigation
- ✅ All close behaviors tested (X button, overlay, ESC, Apply button)

### Files Created
- `src/components/dashboard/FilterPanel/FilterButton.tsx` - Filter trigger button
- `src/components/dashboard/FilterPanel/FilterPanel.tsx` - Main panel component
- `src/components/dashboard/FilterPanel/FilterColumnItem.tsx` - Expandable column item
- `src/components/dashboard/FilterPanel/index.ts` - Module exports
- `tests/unit/epic-20/story-20.2/filter-button.test.tsx` - FilterButton tests
- `tests/unit/epic-20/story-20.2/filter-panel.test.tsx` - FilterPanel tests
- `tests/unit/epic-20/story-20.2/filter-column-item.test.tsx` - FilterColumnItem tests
- `vitest.config.ts` - Vitest configuration for path resolution

### Files Modified
- `src/components/dashboard/employee-table.tsx` - Added FilterButton and FilterPanel integration

## Change Log
- **2026-01-30**: Story 20.2 completed - Filter panel UI infrastructure implemented and tested

## Status
**done** (Note: Implemented together with Stories 20.3 and 20.4 as Epic 20 Phase 1)
