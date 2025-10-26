# Monitoring and Observability

## Monitoring Stack

- **Frontend Monitoring:** Vercel Analytics (Web Vitals, page views)
- **Backend Monitoring:** Vercel Function logs (automatically collected)
- **Error Tracking:** Console.error for MVP (Sentry integration post-MVP)
- **Performance Monitoring:** Vercel Analytics (automatic)

## Key Metrics

**Frontend Metrics:**
- **Core Web Vitals:**
  - LCP (Largest Contentful Paint): <2.5s
  - FID (First Input Delay): <100ms
  - CLS (Cumulative Layout Shift): <0.1
- **JavaScript Errors:** Track via console.error, monitor error rate
- **API Response Times:** Client-side measurement of API call duration
- **User Interactions:** Track key actions (login, create employee, edit cell)

**Backend Metrics:**
- **Request Rate:** Requests per second per endpoint
- **Error Rate:** Percentage of 4xx and 5xx responses
- **Response Time:** P50, P95, P99 latencies
- **Database Query Performance:** Slow query identification (>1s)

**Database Metrics (via Supabase Dashboard):**
- **Connection count:** Monitor connection pool usage
- **Query performance:** Identify slow queries
- **Database size:** Track growth over time
- **RLS overhead:** Monitor impact of row-level security policies

## Logging Strategy

```typescript
// lib/server/logger.ts
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      ...meta,
      timestamp: new Date().toISOString(),
    }));
  },
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }));
  },
};

// Usage in API routes:
// logger.error('Failed to create employee', error, { userId: user.id, input: data });
```

---
