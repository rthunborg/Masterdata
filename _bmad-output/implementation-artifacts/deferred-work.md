## Deferred from: code review of story-22.7 (2026-06-10)

- Pre-existing arbitrary user-activity update risk remains documented in the API matrix. The Story 22.7 diff documents that `/api/admin/users/[id]/update-activity` can be called by any authenticated user with an arbitrary route id, but that route behavior predates this story and is not part of the role/export/RLS evidence-test implementation scope.
