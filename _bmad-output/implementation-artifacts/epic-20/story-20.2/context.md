# Story 20.2 Context

## Design Pattern: Slide-In Panel

We're using a slide-in panel (also called a "drawer" or "sidebar") pattern because:

1. **Preserves Context:** Users can still see the employee table while configuring filters
2. **Space Efficiency:** Provides dedicated space for complex UI without cluttering the main view
3. **Familiar Pattern:** Common in modern web apps (Gmail filters, Trello sidebar, etc.)
4. **Mobile-Friendly:** Can be adapted to full-screen on mobile (though we're desktop-only for now)

## Reference Image

The user provided an example image from a similar system (Jobbsprånget/Relapp) showing:
- Filter panel on right side
- List of expandable filter categories
- Smooth slide-in animation
- Semi-transparent overlay

## Component Architecture

### Why Separate Components?

**FilterButton**
- Reusable trigger component
- Can be placed anywhere in UI
- Manages its own hover/active states

**FilterPanel**
- Complex component with multiple responsibilities
- Easier to test in isolation
- Can be lazy-loaded for performance

**FilterColumnItem**
- Encapsulates expand/collapse logic
- Handles different column types (Story 20.3)
- Reusable for each column

### State Management

```typescript
// In parent component (employee-table.tsx or dashboard page)
const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);

// FilterState type (defined in Story 20.4)
interface FilterState {
  columnId: string;
  type: 'text' | 'boolean' | 'date' | 'select';
  operator: 'equals' | 'contains' | 'between' | 'in';
  value: string | boolean | Date[] | string[];
}
```

## Accessibility Considerations

### Focus Trap
When panel opens, focus should be trapped inside:
1. Focus moves to first interactive element (Close button or first column)
2. Tab cycles through panel elements only
3. Shift+Tab cycles backwards
4. ESC key closes panel and returns focus to Filter button

### ARIA Labels
```jsx
<div role="dialog" aria-modal="true" aria-labelledby="filter-panel-title">
  <h2 id="filter-panel-title">Filter Employees</h2>
  ...
</div>
```

### Screen Reader Announcements
- Announce when panel opens: "Filter panel opened"
- Announce when filters applied: "Filters applied, showing X of Y employees"
- Announce when panel closes: "Filter panel closed"

## Performance Considerations

### Animation Performance
Use `transform` instead of `left/right` for animations:

**Bad (causes layout reflow):**
```css
.panel {
  right: -400px;
  transition: right 300ms;
}
.panel.open {
  right: 0;
}
```

**Good (GPU-accelerated):**
```css
.panel {
  transform: translateX(100%);
  transition: transform 300ms;
}
.panel.open {
  transform: translateX(0);
}
```

### Lazy Loading
Consider lazy loading FilterPanel:
```typescript
const FilterPanel = dynamic(() => import('./FilterPanel/FilterPanel'), {
  ssr: false
});
```

Benefits:
- Reduces initial bundle size
- Panel only loaded when user clicks Filter button
- Improves dashboard load time

### Column List Virtualization
If there are 30+ columns, consider virtualizing the list:
```typescript
import { FixedSizeList } from 'react-window';
```

## Integration with Existing UI

### Current Dashboard Layout

```
┌─────────────────────────────────────────┐
│ Dashboard Header                         │
├─────────────────────────────────────────┤
│ Employee Counters (Stats Bar)           │
├─────────────────────────────────────────┤
│ [Search] [Checkboxes] [Filter ← NEW!]   │ ← Add filter button here
├─────────────────────────────────────────┤
│                                          │
│ Employee Table                           │
│                                          │
└─────────────────────────────────────────┘
```

### Filter Button Placement

Location: `employee-table.tsx` around line 2157-2200 (search input area)

```typescript
<div className="flex items-center gap-2 mb-4">
  {/* Existing search input */}
  <Input ... />

  {/* NEW: Filter button */}
  <FilterButton
    onClick={() => setIsFilterPanelOpen(true)}
    isActive={activeFilters.length > 0}
    filterCount={activeFilters.length}
  />

  {/* Existing controls */}
</div>
```

### Panel z-index Layering

```css
Overlay: z-40
FilterPanel: z-50
Modals: z-60 (if any exist)
Toasts: z-70
```

Ensures panel appears above table but below critical alerts.

## Column Config Integration

### Existing Column Config System

The dashboard already fetches column configs via `useColumnConfigs` hook:
```typescript
const { columnConfigs, isLoading, error } = useColumnConfigs(
  effectiveRole || undefined
);
```

This hook:
1. Fetches from `/api/column-config`
2. Applies RLS (Row Level Security) based on user role
3. Returns only columns user has read access to

### Reusing Column Configs

```typescript
// In FilterPanel.tsx
interface FilterPanelProps {
  columnConfigs: ColumnConfig[];  // Pass from parent
  ...
}

// ColumnConfig type (from @/lib/types/column-config)
interface ColumnConfig {
  id: string;
  field_name: string;
  display_name: string;
  data_type: string;
  is_visible: boolean;
  order: number;
  read_access: string[];
  write_access: string[];
  ...
}
```

We'll filter and map these to filterable columns.

### Which Columns are Filterable?

Most columns are filterable EXCEPT:
- System columns (id, created_at, updated_at)
- Calculated columns (if any)
- Columns with is_visible = false

```typescript
const filterableColumns = columnConfigs
  .filter(col =>
    col.is_visible &&
    !['id', 'created_at', 'updated_at'].includes(col.field_name)
  )
  .sort((a, b) => a.order - b.order);
```

## Testing Philosophy

### Unit Tests Focus
- Component rendering logic
- Click handlers
- Keyboard navigation
- ARIA attributes

### Integration Tests Focus
- Column permission filtering
- State management
- Panel open/close with real data

### E2E Tests Focus (Story 20.2 only)
- Visual regression (panel slides in correctly)
- Click-outside-to-close works
- ESC key works
- Button appears in correct location

## Future Enhancements (Out of Scope for 20.2)

- Resize panel width (drag handle)
- Remember last panel state (localStorage)
- Keyboard shortcuts (e.g., Cmd+F opens panel)
- Panel position (left vs right user preference)
- Multiple panels (filter + columns)

These can be added later based on user feedback.
