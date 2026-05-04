import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('role utility module boundary', () => {
  it('does not runtime-import UserRole from types/user', () => {
    const roleUtilsSource = readFileSync(
      join(process.cwd(), 'src/lib/utils/role-utils.ts'),
      'utf8'
    );

    expect(roleUtilsSource).not.toMatch(
      /import\s*\{\s*UserRole\s*\}\s*from\s*['"]@\/lib\/types\/user['"]/
    );
    expect(roleUtilsSource).toMatch(
      /import\s+type\s*\{\s*UserRole\s*\}\s*from\s*['"]@\/lib\/types\/user['"]/
    );
  });
});
