# Story 20.6 Context

## Why Saved Filters?

### User Research Findings

From user interviews:
- Users apply the same 2-3 filter combinations daily
- Recreating filters manually takes 30-60 seconds each time
- Users forget exact filter criteria (Was it "Jan 1-31" or "Jan 1-Feb 1"?)
- Sharing filter combinations with colleagues is difficult

**Solution:** Save frequently-used filters with memorable names

### Efficiency Gains

**Without saved filters:**
1. Click Filter button (1s)
2. Find first_name column (3s)
3. Type search term (2s)
4. Find omc_date column (3s)
5. Select date range (5s)
6. Find hotel_required column (3s)
7. Select Yes (1s)
**Total: ~18 seconds**

**With saved filters:**
1. Click Filter button (1s)
2. Select "New Hires Needing Hotel" (2s)
**Total: ~3 seconds**

**6x faster!**

## Database Design Decisions

### JSONB for Filters

**Why JSONB instead of separate table?**

**Option A: Separate filter_criteria table**
```sql
CREATE TABLE filter_criteria (
  id UUID PRIMARY KEY,
  filter_id UUID REFERENCES user_filters(id),
  column_id TEXT,
  type TEXT,
  value TEXT
);
```

**Pros:**
- Normalized database design
- Easy to query specific criteria

**Cons:**
- Complex queries (multiple joins)
- More API calls to reconstruct filter
- Harder to maintain consistency

**Option B: JSONB column** (CHOSEN)
```sql
CREATE TABLE user_filters (
  id UUID PRIMARY KEY,
  name TEXT,
  filters JSONB  -- Entire filter array as JSON
);
```

**Pros:**
- Single database row = complete filter
- Atomic updates (no multi-row consistency issues)
- Fast retrieval (one query)
- Flexible schema (easy to add filter types)

**Cons:**
- Can't easily query "all filters using column X"
- Slightly larger storage

**Decision:** JSONB - simplicity and performance outweigh query limitations

### Unique Constraint

```sql
UNIQUE (user_id, name)
```

**Why enforce uniqueness?**
- Prevents confusion ("Which 'New Hires' filter did I mean?")
- Makes dropdown selection clear
- Forces user to use descriptive names

**Why per-user, not global?**
- Different users have different naming preferences
- User A might want "My Filter" while User B uses same name

**Alternative considered:** Add version suffix automatically ("New Hires (2)")
**Rejected:** Too implicit, better to show error and let user rename

### Cascade Delete

```sql
REFERENCES auth.users(id) ON DELETE CASCADE
```

**Why cascade?**
- User deleted → their filters are meaningless
- Prevents orphaned filter records
- Simpler cleanup logic

**Why not SET NULL?**
- Filter without a user makes no sense
- Would need cron job to clean up

## API Design

### RESTful Endpoints

```
GET    /api/users/filters       # List all user's filters
POST   /api/users/filters       # Create new filter
GET    /api/users/filters/:id   # Get specific filter (future)
PUT    /api/users/filters/:id   # Update filter (future)
DELETE /api/users/filters/:id   # Delete filter
```

### Why not nested under /api/users/:id/filters?

**Current:** `/api/users/filters`
**Alternative:** `/api/users/:userId/filters`

**Reasoning:**
- User ID comes from auth token, not URL
- Simpler URLs
- Impossible to access other users' filters (RLS enforcement)
- Consistent with existing API patterns in codebase

### Request/Response Format

**Create Filter Request:**
```json
POST /api/users/filters
{
  "name": "New Hires This Month",
  "filters": [
    {
      "columnId": "created_at",
      "type": "date",
      "dateRange": {
        "from": "2024-01-01T00:00:00.000Z",
        "to": "2024-01-31T23:59:59.999Z"
      }
    }
  ]
}
```

**Create Filter Response:**
```json
201 Created
{
  "data": {
    "id": "uuid-123",
    "user_id": "uuid-456",
    "name": "New Hires This Month",
    "filters": [...],
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (Duplicate Name):**
```json
409 Conflict
{
  "error": "A filter with this name already exists"
}
```

## State Management

### React Query Strategy

**Why React Query?**
- Automatic caching
- Background refetching
- Optimistic updates
- Request deduplication

**Cache Configuration:**
```typescript
{
  queryKey: ['user_filters'],
  staleTime: 5 * 60 * 1000,  // 5 minutes
  cacheTime: 10 * 60 * 1000,  // 10 minutes
  refetchOnWindowFocus: false  // Don't refetch when tab regains focus
}
```

**Reasoning:**
- Saved filters change infrequently (5min stale time reasonable)
- Keep in cache for 10min even if unmounted
- Don't refetch on focus (annoying for user)

### Mutation Flow

**Save Filter:**
```
User clicks "Save"
  ↓
useMutation fires
  ↓
Optimistic Update (optional)
  ↓
POST /api/users/filters
  ↓
Success: invalidateQueries(['user_filters'])
  ↓
React Query refetches
  ↓
Dropdown updates automatically
```

**Delete Filter:**
```
User clicks "Delete"
  ↓
Confirmation dialog
  ↓
User confirms
  ↓
DELETE /api/users/filters/:id
  ↓
Success: invalidateQueries(['user_filters'])
  ↓
Filter removed from dropdown
```

### Optimistic Updates (Optional Enhancement)

```typescript
const saveMutation = useMutation({
  mutationFn: saveFilterAPI,
  onMutate: async (newFilter) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['user_filters'] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(['user_filters']);

    // Optimistically update
    queryClient.setQueryData(['user_filters'], (old) => [
      ...old,
      { id: 'temp-id', ...newFilter }
    ]);

    return { previous };
  },
  onError: (err, newFilter, context) => {
    // Rollback on error
    queryClient.setQueryData(['user_filters'], context.previous);
  },
  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ['user_filters'] });
  }
});
```

## UX Flow

### Happy Path

```
1. User applies multiple filters
   ↓
2. Click "Save Filter" button
   ↓
3. Dialog opens with filter summary
   ↓
4. User enters name: "Remote Workers Q1"
   ↓
5. Click "Save"
   ↓
6. Toast: "Filter saved successfully"
   ↓
7. "Remote Workers Q1" appears in dropdown
   ↓
8. User can select it anytime to reapply
```

### Error Paths

**Duplicate Name:**
```
1. User enters name "New Hires"
2. Clicks Save
3. API returns 409 Conflict
4. Show error below input: "A filter with this name already exists"
5. Input stays open for user to change name
```

**Validation Error:**
```
1. User clicks Save with empty name
2. Save button disabled (prevents submission)
3. Input shows red border
4. Hint text: "Name is required"
```

**Network Error:**
```
1. User clicks Save
2. API call fails (network issue)
3. Toast error: "Failed to save filter. Please try again."
4. Dialog stays open
5. User can retry
```

## UI Design Patterns

### Save Button Placement

**Options:**

**A) In panel header (chosen)**
```
┌─────────────────────────────────┐
│ ✕  [Copy Link] [Save Filter]    │
├─────────────────────────────────┤
│ Saved Filters ▼                 │
│ ...                             │
└─────────────────────────────────┘
```

**B) At bottom**
```
┌─────────────────────────────────┐
│ ✕                               │
├─────────────────────────────────┤
│ ...                             │
├─────────────────────────────────┤
│ [Save Filter] [Apply & Close]   │
└─────────────────────────────────┘
```

**Decision:** Header placement
- More visible
- Consistent with "Copy Link" button
- Available while scrolling filters

### Saved Filters Dropdown

**Design:**
```
My Saved Filters ▼
┌─────────────────────────────────┐
│ New Hires This Month            │
│ Pending Onboarding              │
│ Remote Workers (current)        │ ← Indicator
│ Needs Hotel - Q1                │
└─────────────────────────────────┘
```

**Interactions:**
- Click name → Apply filter
- Hover → Show delete button (X)
- "(current)" badge if filters match

### Delete Confirmation

**Design:**
```
┌─────────────────────────────────┐
│  ⚠️  Delete saved filter?        │
│                                 │
│  Are you sure you want to       │
│  delete "New Hires This Month"? │
│  This action cannot be undone.  │
│                                 │
│  [Cancel]  [Delete]             │
└─────────────────────────────────┘
```

**Reasoning:**
- Prevents accidental deletion
- Shows filter name for confirmation
- Clear consequence messaging

## Security Considerations

### Row Level Security (RLS)

**Critical:** Users must only access their own filters

```sql
CREATE POLICY "Users can view their own filters"
  ON user_filters FOR SELECT
  USING (auth.uid() = user_id);
```

**Test cases:**
- User A cannot see User B's filters
- API with User A's token cannot read filters WHERE user_id = User B
- Supabase enforces this at database level (not just API)

### SQL Injection Protection

**JSONB filters are user-provided data!**

**Safe (using parameterized queries):**
```typescript
const { data } = await supabase
  .from('user_filters')
  .insert({
    filters: body.filters  // Supabase escapes this
  });
```

**Unsafe (string concatenation):**
```typescript
// DON'T DO THIS
const query = `INSERT INTO user_filters (filters) VALUES ('${body.filters}')`;
```

**Why safe?**
- Supabase/Postgres handles JSON serialization
- No direct SQL string building
- JSONB type validates JSON structure

### XSS Prevention

**Filter names are displayed in UI!**

**Safe (React auto-escapes):**
```tsx
<span>{filter.name}</span>  // React escapes HTML
```

**Unsafe (dangerouslySetInnerHTML):**
```tsx
<div dangerouslySetInnerHTML={{ __html: filter.name }} />
```

**Additional validation:**
```typescript
const validateFilterName = (name: string): boolean => {
  // Max length
  if (name.length > 50) return false;

  // No special characters (optional)
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) return false;

  return true;
};
```

## Performance Optimization

### Caching Strategy

**Problem:** Fetching saved filters on every filter panel open

**Solution:** React Query cache + prefetch

```typescript
// Prefetch on dashboard mount
useEffect(() => {
  queryClient.prefetchQuery({
    queryKey: ['user_filters'],
    queryFn: fetchSavedFilters
  });
}, []);

// Cache available immediately when panel opens
// No loading spinner needed!
```

### Pagination (Future)

If users have 100+ saved filters:

```typescript
// Add pagination to API
GET /api/users/filters?page=1&limit=20

// Infinite scroll in dropdown
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['user_filters'],
  queryFn: ({ pageParam = 1 }) => fetchFilters(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextPage
});
```

**Current:** No pagination (assume <50 filters per user)

## Testing Strategy

### Database Tests

```sql
-- Test RLS policies
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-a-id"}';

-- User A creates filter
INSERT INTO user_filters (user_id, name, filters)
VALUES ('user-a-id', 'My Filter', '[]'::jsonb);

-- User A can read their filter
SELECT * FROM user_filters WHERE user_id = 'user-a-id';
-- Returns 1 row ✓

-- User A cannot read User B's filter
SELECT * FROM user_filters WHERE user_id = 'user-b-id';
-- Returns 0 rows ✓
```

### API Tests

```typescript
describe('POST /api/users/filters', () => {
  it('requires authentication', async () => {
    const response = await fetch('/api/users/filters', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', filters: [] })
    });
    expect(response.status).toBe(401);
  });

  it('creates filter for authenticated user', async () => {
    const response = await authFetch('/api/users/filters', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', filters: [] })
    });
    expect(response.status).toBe(201);
  });

  it('rejects duplicate names', async () => {
    await createFilter({ name: 'Duplicate' });
    const response = await createFilter({ name: 'Duplicate' });
    expect(response.status).toBe(409);
  });
});
```

### Integration Tests

```typescript
it('saves and loads filter correctly', async () => {
  const { result } = renderHook(() => useSavedFilters());

  // Save filter
  await act(async () => {
    await result.current.saveFilter({
      name: 'Test Filter',
      filters: [{ columnId: 'first_name', type: 'text', textValue: 'john' }]
    });
  });

  // Verify it appears in list
  expect(result.current.savedFilters).toContainEqual(
    expect.objectContaining({ name: 'Test Filter' })
  );
});
```

## Future Enhancements

### Filter Sharing

Allow users to share filters with team:

```sql
ALTER TABLE user_filters ADD COLUMN is_shared BOOLEAN DEFAULT FALSE;
ALTER TABLE user_filters ADD COLUMN shared_with TEXT[]; -- Array of user IDs

CREATE POLICY "Users can view shared filters"
  ON user_filters FOR SELECT
  USING (is_shared = TRUE AND auth.uid() = ANY(shared_with));
```

### Filter Templates

System-provided filter templates:

```typescript
const templates = [
  {
    name: 'New Hires (Last 30 Days)',
    filters: [/* preset filters */],
    category: 'Onboarding'
  },
  // ... more templates
];
```

### Filter Analytics

Track which filters are used most:

```typescript
CREATE TABLE filter_usage (
  id UUID PRIMARY KEY,
  filter_id UUID REFERENCES user_filters(id),
  user_id UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

// Show "Most Used" in dropdown
```

### Filter Export/Import

Download filters as JSON for backup:

```typescript
const exportFilters = () => {
  const json = JSON.stringify(savedFilters, null, 2);
  downloadFile(json, 'my-filters.json');
};

const importFilters = (file: File) => {
  const filters = JSON.parse(await file.text());
  // Validate and import
};
```

These are out of scope for Epic 20 but valuable for future iterations.
