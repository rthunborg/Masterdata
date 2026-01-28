# Emergency fix script for API route authentication
# Fixes Next.js 16.0.7 cookies() issue in Vercel production

$apiRoutesPath = "src\app\api"
$excludePatterns = @("auth\login", "auth\logout", "health", "debug", "test-db")

Write-Host "🔍 Finding API route files..." -ForegroundColor Cyan

$files = Get-ChildItem -Path $apiRoutesPath -Recurse -Filter "route.ts"

$updatedCount = 0

foreach ($file in $files) {
    $relativePath = $file.FullName.Replace($PWD.Path + "\", "")
    
    # Skip excluded patterns
    $skip = $false
    foreach ($pattern in $excludePatterns) {
        if ($relativePath -match $pattern) {
            Write-Host "⏭️  Skipping: $relativePath" -ForegroundColor Gray
            $skip = $true
            break
        }
    }
    
    if ($skip) { continue }
    
    $content = Get-Content $file.FullName -Raw
    $original = $content
    $modified = $false
    
    # 1. Add NextRequest to imports if missing
    if ($content -match 'from\s+"next/server"' -and $content -notmatch 'NextRequest') {
        $content = $content -replace 'import\s*\{\s*NextResponse\s*\}\s*from\s*"next/server"', 'import { NextRequest, NextResponse } from "next/server"'
        $modified = $true
    }
    
    # 2. Replace createClient with createAPIClient in imports
    if ($content -match 'from\s+"@/lib/supabase/server"') {
        $content = $content -replace 'from\s+"@/lib/supabase/server"', 'from "@/lib/supabase/server-api"'
        $content = $content -replace 'createClient', 'createAPIClient'
        $modified = $true
    }
    
    # 3. Update function signatures to accept NextRequest
    $content = $content -replace 'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\(\s*\)', 'export async function $1(request: NextRequest)'
    $content = $content -replace 'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\(\s*request:\s*Request\s*\)', 'export async function $1(request: NextRequest)'
    
    # 4. Update auth API calls to pass request parameter
    $content = $content -replace 'requireAuthAPI\(\)', 'requireAuthAPI(request)'
    $content = $content -replace 'requireHRAdminAPI\(\)', 'requireHRAdminAPI(request)'
    $content = $content -replace 'requireEmployeeManagerAPI\(\)', 'requireEmployeeManagerAPI(request)'
    
    # 5. Fix createAPIClient calls
    $content = $content -replace 'const\s+supabase\s*=\s*await\s+createAPIClient\(\)', 'const supabase = createAPIClient(request)'
    $content = $content -replace 'const\s+supabase\s*=\s*createAPIClient\(\)', 'const supabase = createAPIClient(request)'
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "✅ Updated: $relativePath" -ForegroundColor Green
        $updatedCount++
    }
}

Write-Host "`n🎉 Updated $updatedCount files" -ForegroundColor Green
Write-Host "📝 Don't forget to commit and deploy!" -ForegroundColor Yellow
