/**
 * EMERGENCY FIX SCRIPT
 * Fixes authentication in API routes by updating to use request-based Supabase client
 * 
 * Run with: npx tsx scripts/fix-api-auth.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const API_ROUTES_PATTERN = 'src/app/api/**/route.ts';
const EXCLUDE_PATTERNS = ['auth/login', 'auth/logout', 'health', 'debug'];

async function main() {
  const files = await glob(API_ROUTES_PATTERN, { 
    cwd: process.cwd(),
    absolute: true 
  });

  let updatedCount = 0;
  
  for (const filePath of files) {
    // Skip auth and special endpoints
    if (EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern))) {
      console.log(`⏭️  Skipping: ${path.relative(process.cwd(), filePath)}`);
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Update imports
    if (content.includes('from "next/server"') && !content.includes('NextRequest')) {
      content = content.replace(
        /import\s*\{\s*NextResponse\s*\}\s*from\s*"next\/server"/,
        'import { NextRequest, NextResponse } from "next/server"'
      );
      modified = true;
    }

    // 2. Replace createClient with createAPIClient import
    if (content.includes('from "@/lib/supabase/server"')) {
      content = content.replace(
        'from "@/lib/supabase/server"',
        'from "@/lib/supabase/server-api"'
      );
      content = content.replace(/createClient/g, 'createAPIClient');
      modified = true;
    }

    // 3. Update function signatures to accept request
    const functionPatterns = [
      /export async function (GET|POST|PUT|PATCH|DELETE)\(\)/g,
      /export async function (GET|POST|PUT|PATCH|DELETE)\(request: Request\)/g,
    ];

    for (const pattern of functionPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, 'export async function $1(request: NextRequest)');
        modified = true;
      }
    }

    // 4. Update auth API calls to pass request
    const authPatterns = [
      /requireAuthAPI\(\)/g,
      /requireHRAdminAPI\(\)/g,
      /requireEmployeeManagerAPI\(\)/g,
      /requireRoleAPI\(\[([^\]]+)\]\)/g,
    ];

    for (const pattern of authPatterns) {
      if (pattern.test(content)) {
        if (pattern.source.includes('requireRoleAPI')) {
          content = content.replace(pattern, 'requireRoleAPI([$1], request)');
        } else {
          content = content.replace(pattern, pattern.source.replace('\\(\\)', '(request)'));
        }
        modified = true;
      }
    }

    // 5. Replace createClient() calls with createAPIClient(request)
    content = content.replace(/const supabase = await createAPIClient\(\)/g, 'const supabase = createAPIClient(request)');
    content = content.replace(/const supabase = createAPIClient\(\)/g, 'const supabase = createAPIClient(request)');

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${path.relative(process.cwd(), filePath)}`);
      updatedCount++;
    } else {
      console.log(`   No changes: ${path.relative(process.cwd(), filePath)}`);
    }
  }

  console.log(`\n🎉 Updated ${updatedCount} files`);
}

main().catch(console.error);
