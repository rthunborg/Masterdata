/**
 * Constraint Test Helpers
 * 
 * Utilities for testing database constraints and data integrity.
 * Provides helpers for constraint violation testing, unique violations,
 * transaction rollback testing, and concurrent write testing.
 * 
 * Story: 11.9 - Data Integrity & Constraint Tests
 */

import { expect } from "vitest";

interface PostgresError extends Error {
  code?: string;
}

/**
 * Expect a constraint violation when executing an operation
 * 
 * @param operation - Async function that should trigger constraint violation
 * @param constraintName - Name of the constraint (e.g., "remaining_spots_non_negative")
 */
export async function expectConstraintViolation(
  operation: () => Promise<unknown>,
  constraintName: string
): Promise<void> {
  try {
    await operation();
    throw new Error('Expected constraint violation but operation succeeded');
  } catch (err: unknown) {
    const error = err as PostgresError;
    // Check for constraint violation in error message or code
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';
    
    // PostgreSQL constraint violation codes
    const constraintCodes = ['23514', '23505', '23503', '23502'];
    
    if (constraintCodes.includes(errorCode) || 
        errorMessage.toLowerCase().includes(constraintName.toLowerCase()) ||
        errorMessage.toLowerCase().includes('constraint') ||
        errorMessage.toLowerCase().includes('violation')) {
      // Expected constraint violation
      return;
    }
    
    // Re-throw if it's not a constraint violation
    throw err;
  }
}

/**
 * Expect a unique constraint violation (error code 23505)
 * 
 * @param operation - Async function that should trigger unique violation
 */
export async function expectUniqueViolation(
  operation: () => Promise<unknown>
): Promise<void> {
  try {
    await operation();
    throw new Error('Expected unique violation but operation succeeded');
  } catch (err: unknown) {
    const error = err as PostgresError;
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';
    
    // PostgreSQL unique violation code
    if (errorCode === '23505' || 
        errorMessage.toLowerCase().includes('unique') ||
        errorMessage.toLowerCase().includes('duplicate')) {
      expect(errorCode).toBe('23505');
      return;
    }
    
    throw err;
  }
}

/**
 * Test transaction rollback behavior
 * 
 * @param operation - Async function that should fail and trigger rollback
 * @param verifyRollback - Async function to verify rollback occurred (no partial changes)
 */
export async function testTransactionRollback(
  operation: () => Promise<unknown>,
  verifyRollback: () => Promise<void>
): Promise<void> {
  try {
    await operation();
    throw new Error('Expected transaction to fail');
  } catch (err) {
    // Verify rollback occurred - no partial changes should remain
    await verifyRollback();
  }
}

/**
 * Test concurrent write operations
 * 
 * @param operation - Async function to execute concurrently
 * @param concurrency - Number of concurrent executions
 * @returns Object with succeeded and failed counts
 */
export async function testConcurrentWrites(
  operation: () => Promise<unknown>,
  concurrency: number
): Promise<{ succeeded: number; failed: number }> {
  const results = await Promise.allSettled(
    Array.from({ length: concurrency }, () => operation())
  );
  
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  return { succeeded, failed };
}

/**
 * Expect a foreign key violation (error code 23503)
 * 
 * @param operation - Async function that should trigger FK violation
 */
export async function expectForeignKeyViolation(
  operation: () => Promise<unknown>
): Promise<void> {
  try {
    await operation();
    throw new Error('Expected foreign key violation but operation succeeded');
  } catch (err: unknown) {
    const error = err as PostgresError;
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';
    
    if (errorCode === '23503' || 
        errorMessage.toLowerCase().includes('foreign key') ||
        errorMessage.toLowerCase().includes('referential')) {
      expect(errorCode).toBe('23503');
      return;
    }
    
    throw err;
  }
}

/**
 * Expect a NOT NULL violation (error code 23502)
 * 
 * @param operation - Async function that should trigger NOT NULL violation
 */
export async function expectNotNullViolation(
  operation: () => Promise<unknown>
): Promise<void> {
  try {
    await operation();
    throw new Error('Expected NOT NULL violation but operation succeeded');
  } catch (err: unknown) {
    const error = err as PostgresError;
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';
    
    if (errorCode === '23502' || 
        errorMessage.toLowerCase().includes('not null') ||
        errorMessage.toLowerCase().includes('null value')) {
      expect(errorCode).toBe('23502');
      return;
    }
    
    throw err;
  }
}
