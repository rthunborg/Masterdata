# Story 20.5 Context

## Importance of Visual Feedback

### User's Mental Model

Without clear indicators:
- "Am I looking at all employees or filtered ones?"
- "Did my filter actually apply?"
- "How do I get back to seeing everyone?"

With clear indicators:
- ✅ Badge on button → "I have 3 filters active"
- ✅ Filtered count → "Showing 12 of 87 employees"
- ✅ Clear button → "One click to remove all filters"

### Nielsen's 10 Usability Heuristics

This story addresses:
1. **Visibility of system status** - Always show filter state
2. **User control and freedom** - Easy to undo (clear filters)
3. **Recognition rather than recall** - Don't make users remember filter state

## Design Patterns

### Badge Pattern

Used to draw attention to state changes:
- Notification badges (unread count)
- Shopping cart count
- Active filters count

**Best Practices:**
- Use contrasting color (primary/accent)
- Keep count visible (no "99+" needed for filters)
- Position consistently (right side of button text)
- Add subtle animation on change (optional pulse)

### Clear Action Proximity

"Clear filter" button should be:
- **Near** the filter button (spatial relationship)
- **Visible** when filters active (conditional rendering)
- **Clear** in purpose (obvious label + icon)

**Bad:**
```
[Search] [Columns]              [Filter (3)]
                                           [Clear] ← Far away
```

**Good:**
```
[Search] [Columns]    [Clear Filter] [Filter (3)] ← Adjacent
```

### Filtered Count Display

Three display strategies:

**Option A: Separate line**
```
Showing 12 of 87 employees
[Table...]
```

**Option B: Inline with title**
```
Employee List (12 of 87)
[Table...]
```

**Option C: In table footer**
```
[Table...]
Showing 12 of 87 employees
```

**Decision:** Option A - Separate line above table
- Most visible
- Doesn't clutter table header
- Can include additional context

## Animation Strategy

### When to Animate

**DO animate:**
- Badge appearance (fade in + scale)
- Filter count change (number flip)
- Clear button appearance (slide in)
- Empty state (fade in)

**DON'T animate:**
- Table row updates (too distracting)
- Frequent filter changes (causes motion sickness)
- Loading states <50ms (too fast to perceive)

### Animation Principles

**Timing:**
- Fast: 150-200ms for small UI changes (badge)
- Medium: 200-300ms for panel opening/closing
- Slow: 300-500ms for complex state changes

**Easing:**
- Use `ease-out` for entrances (starts fast, ends slow)
- Use `ease-in` for exits (starts slow, ends fast)
- Avoid `linear` (feels robotic)

**Example:**
```css
.badge {
  animation: badge-appear 200ms ease-out;
}

@keyframes badge-appear {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

## Loading States

### When to Show Loading

**Problem:** Filtering might take 10-100ms depending on:
- Number of employees
- Complexity of filters
- Browser performance

**Solution:** Only show loading if >50ms

```typescript
const [isFiltering, setIsFiltering] = useState(false);
let loadingTimeout: NodeJS.Timeout;

const applyFilter = (filter: FilterState) => {
  // Start loading indicator after 50ms delay
  loadingTimeout = setTimeout(() => {
    setIsFiltering(true);
  }, 50);

  // Apply filter
  const result = filterEmployees(employees, filter);

  // Clear timeout and loading state
  clearTimeout(loadingTimeout);
  setIsFiltering(false);

  return result;
};
```

This prevents flashing loading states for fast operations.

### Loading UI

**Option A: Overlay**
```tsx
{isFiltering && (
  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm">
    <Loader2 className="animate-spin" />
  </div>
)}
```

**Option B: Inline spinner**
```tsx
{isFiltering ? (
  <Loader2 className="animate-spin" />
) : (
  <span>{filteredCount} employees</span>
)}
```

**Option C: Progress bar**
```tsx
{isFiltering && <Progress value={/* indeterminate */} />}
```

**Decision:** Option B for filtered count, Option A for table overlay (only if >100ms)

## Empty State Design

### Content Strategy

**Avoid:**
- Technical jargon ("No records match your query")
- Blame ("You filtered too aggressively")
- Dead end ("No results")

**Prefer:**
- Friendly tone ("No employees found")
- Helpful guidance ("Try adjusting your filters")
- Quick action ("Clear filters to see all")

### Visual Hierarchy

```
[Icon - Large, centered]
[Heading - "No employees found"]
[Body - Explanation]
[List - Active filters]
[Action - Clear filters button]
```

### Example

```tsx
<div className="py-12 text-center">
  <Users className="h-16 w-16 text-muted mx-auto mb-4" />
  <h3 className="text-lg font-semibold mb-2">No employees match</h3>
  <p className="text-muted-foreground mb-4">
    Try adjusting your filter criteria or{' '}
    <button onClick={onClear} className="text-primary underline">
      clear all filters
    </button>
  </p>

  <div className="inline-block text-left">
    <p className="text-sm font-medium mb-2">Current filters:</p>
    <ul className="text-sm text-muted-foreground space-y-1">
      {filters.map(f => (
        <li key={f.columnId}>• {formatFilter(f)}</li>
      ))}
    </ul>
  </div>
</div>
```

## Accessibility

### Screen Reader Announcements

Use ARIA live regions to announce filter changes:

```tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {filterCount > 0 && `${filterCount} filters active. Showing ${filteredCount} of ${totalCount} employees.`}
</div>
```

### Focus Management

When clearing filters:
1. Clear filters
2. Announce change to screen reader
3. Return focus to filter button

```typescript
const handleClearFilters = () => {
  clearAllFilters();

  // Announce to screen reader
  announceToScreenReader('All filters cleared');

  // Return focus
  filterButtonRef.current?.focus();
};
```

### Keyboard Shortcuts

Consider adding:
- `Cmd/Ctrl + K` → Open filter panel
- `Escape` → Clear all filters (when focus in filter panel)
- `Cmd/Ctrl + Backspace` → Clear all filters (global)

```typescript
useEffect(() => {
  const handleKeyboard = (e: KeyboardEvent) => {
    // Cmd+K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openFilterPanel();
    }

    // Escape in filter panel
    if (e.key === 'Escape' && isFilterPanelOpen) {
      clearAllFilters();
    }
  };

  window.addEventListener('keydown', handleKeyboard);
  return () => window.removeEventListener('keydown', handleKeyboard);
}, [isFilterPanelOpen]);
```

## Color & Contrast

### Filter Button States

**Inactive (no filters):**
- Border: `border-input` (gray-300)
- Background: `bg-background` (white)
- Text: `text-foreground` (gray-900)

**Active (filters applied):**
- Border: `border-primary` (blue-600)
- Background: `bg-primary` (blue-600)
- Text: `text-primary-foreground` (white)
- Ring: `ring-2 ring-primary ring-offset-2`

### Badge Colors

```css
.badge {
  background-color: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  border: 1px solid hsl(var(--border));
}
```

Ensure 4.5:1 contrast ratio for WCAG AA compliance.

## Performance Considerations

### Avoid Re-renders

**Problem:** Filter count changes → Badge re-renders → Button re-renders → Entire toolbar re-renders

**Solution:** Memoization

```typescript
const FilterButton = memo(({ onClick, filterCount }: FilterButtonProps) => {
  return (
    <Button onClick={onClick}>
      Filter
      {filterCount > 0 && <Badge>{filterCount}</Badge>}
    </Button>
  );
});

// Only re-render when filterCount actually changes
```

### Debounce Count Updates

If filter count updates very frequently (text input):

```typescript
const [displayCount, setDisplayCount] = useState(filterCount);

useEffect(() => {
  const timer = setTimeout(() => {
    setDisplayCount(filterCount);
  }, 100);

  return () => clearTimeout(timer);
}, [filterCount]);
```

This prevents badge from flickering during rapid filter changes.

## Testing Checklist

### Visual Tests

- [ ] Badge appears when filter applied
- [ ] Badge count updates correctly
- [ ] Badge animates smoothly
- [ ] Clear button appears/disappears
- [ ] Filtered count displays correctly
- [ ] Empty state renders properly
- [ ] Loading state shows (if >50ms)
- [ ] All colors have sufficient contrast

### Interaction Tests

- [ ] Click clear button → filters cleared
- [ ] Apply filter → badge appears
- [ ] Remove filter → badge updates
- [ ] Remove last filter → badge disappears
- [ ] Filter to zero results → empty state shows

### Accessibility Tests

- [ ] Screen reader announces filter changes
- [ ] Keyboard navigation works
- [ ] Focus management correct
- [ ] ARIA labels present
- [ ] Color contrast passes WCAG AA

### Edge Cases

- [ ] 10+ filters (badge doesn't overflow)
- [ ] Very long filter values (truncate gracefully)
- [ ] Rapid filter changes (no flicker)
- [ ] Slow filter calculation (loading state)
- [ ] Network error fetching dates (graceful degradation)

## Future Enhancements

### Filter Persistence Indicator

Show if current filters match a saved filter:
```tsx
<Badge variant="success">
  <Check className="h-3 w-3 mr-1" />
  "New Hires" filter
</Badge>
```

### Filter Suggestions

When empty state, suggest related filters:
```tsx
<p>No matches. Try:</p>
<div className="flex gap-2">
  <Button variant="outline" size="sm">
    Broaden date range
  </Button>
  <Button variant="outline" size="sm">
    Remove text filter
  </Button>
</div>
```

### Filter History

Show recent filter combinations:
```tsx
<Popover>
  <PopoverTrigger>Recent filters</PopoverTrigger>
  <PopoverContent>
    {recentFilters.map(f => (
      <Button onClick={() => applyFilters(f)}>
        {f.name} - {f.timestamp}
      </Button>
    ))}
  </PopoverContent>
</Popover>
```
