import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Shared API response helpers to eliminate duplication across route handlers.
 *
 * Before this module existed every route hand-rolled the same JSON shapes for
 * validation errors, not-found, duplicates, etc.  Centralising them here means
 * a single place to change the contract if we ever need to.
 */

export function createValidationErrorResponse(error: ZodError) {
  const details = error.issues.reduce((acc, err) => {
    const field = err.path.join(".");
    if (!acc[field]) acc[field] = [];
    acc[field].push(err.message);
    return acc;
  }, {} as Record<string, string[]>);

  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message || "Invalid input data",
        details,
        timestamp: new Date().toISOString(),
      },
    },
    { status: 400 }
  );
}

export function createNotFoundResponse(resource: string, id: string) {
  return NextResponse.json(
    {
      error: {
        code: "NOT_FOUND",
        message: `${resource} with ID ${id} not found`,
        timestamp: new Date().toISOString(),
      },
    },
    { status: 404 }
  );
}

export function createDuplicateResponse(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "DUPLICATE_ENTRY",
        message,
        timestamp: new Date().toISOString(),
      },
    },
    { status: 409 }
  );
}

/**
 * Detect whether an error is a PE3 duplicate-date constraint violation.
 * The check is intentionally broad because the message may come from
 * application code ("PE3 date … already assigned") or from PostgreSQL
 * ("duplicate key value … pe3_date").
 */
export function isDuplicatePE3DateError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    (msg.includes("PE3 date") && msg.includes("already assigned")) ||
    (msg.includes("duplicate key value") && msg.includes("pe3_date")) ||
    (msg.includes("unique constraint") && msg.includes("pe3_date"))
  );
}

export function createDuplicatePE3Response(error: Error) {
  return NextResponse.json(
    {
      error: {
        code: "DUPLICATE_PE3_DATE",
        message: error.message.includes("already assigned")
          ? error.message
          : "This PE3 date is already assigned to another employee",
        timestamp: new Date().toISOString(),
      },
    },
    { status: 409 }
  );
}

/**
 * Wraps a Zod parse call and returns a validation error response on failure.
 * On success returns the parsed data; on ZodError returns a NextResponse.
 * Rethrows non-Zod errors.
 *
 * Usage:
 *   const result = parseOrError(schema, body);
 *   if (result instanceof NextResponse) return result;
 *   // result is now the validated data
 */
export function parseOrError<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown
): T | NextResponse {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return createValidationErrorResponse(error);
    }
    throw error;
  }
}
