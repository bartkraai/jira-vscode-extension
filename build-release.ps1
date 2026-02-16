# Build and Release Script for 42-Jira-Buddy
# Version: 0.2.0
# Usage: .\build-release.ps1

param(
    [string]$Version = "0.2.0",
    [switch]$SkipTests = $false,
    [switch]$CreateTag = $true
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  42-Jira-Buddy Release Builder" -ForegroundColor Cyan
Write-Host "  Version: $Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean previous builds
Write-Host "[1/8] Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path ".\out") { Remove-Item ".\out" -Recurse -Force }
if (Test-Path ".\release") { Remove-Item ".\release" -Recurse -Force }
if (Test-Path "*.vsix") { Remove-Item "*.vsix" -Force }
Write-Host "✓ Cleanup complete" -ForegroundColor Green
Write-Host ""

# Step 2: Install dependencies
Write-Host "[2/8] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 3: Run tests (optional)
if (-not $SkipTests) {
    Write-Host "[3/8] Running tests..." -ForegroundColor Yellow
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Tests failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Tests passed" -ForegroundColor Green
} else {
    Write-Host "[3/8] Skipping tests (--SkipTests flag)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Compile TypeScript
Write-Host "[4/8] Compiling TypeScript..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Compilation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ TypeScript compiled" -ForegroundColor Green
Write-Host ""

# Step 5: Build production bundle
Write-Host "[5/8] Building production bundle..." -ForegroundColor Yellow
npm run package
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Webpack build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Production bundle created" -ForegroundColor Green
Write-Host ""

# Step 6: Create VSIX package
Write-Host "[6/8] Creating VSIX package..." -ForegroundColor Yellow
npx @vscode/vsce package --allow-missing-repository
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ VSIX creation failed" -ForegroundColor Red
    exit 1
}
$vsixFile = "42-jira-buddy-$Version.vsix"
if (-not (Test-Path $vsixFile)) {
    Write-Host "✗ VSIX file not found: $vsixFile" -ForegroundColor Red
    exit 1
}
Write-Host "✓ VSIX package created: $vsixFile" -ForegroundColor Green
Write-Host ""

# Step 7: Create release artifacts
Write-Host "[7/8] Creating release artifacts..." -ForegroundColor Yellow

# Create release directory
New-Item -ItemType Directory -Force -Path ".\release" | Out-Null

# Copy VSIX
Copy-Item $vsixFile ".\release\" -Force

# Generate checksum
$hash = (Get-FileHash $vsixFile -Algorithm SHA256).Hash
$checksumContent = @"
# SHA256 Checksums for 42-Jira-Buddy v$Version

``````
$hash  $vsixFile
``````

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@
$checksumContent | Out-File ".\release\checksums.txt" -Encoding utf8

# Copy documentation
Copy-Item ".\RELEASE_NOTES.md" ".\release\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\CHANGELOG.md" ".\release\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\README.md" ".\release\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\LICENSE" ".\release\" -Force -ErrorAction SilentlyContinue

# Create release README
$releaseReadme = @"
# Release Artifacts for v$Version

- **VSIX Package:** $vsixFile
- **Size:** $((Get-Item ".\release\$vsixFile").Length / 1KB) KB
- **Checksum:** See checksums.txt
- **Build Date:** $(Get-Date -Format "yyyy-MM-dd")

## Installation

``````bash
code --install-extension $vsixFile
``````

See RELEASE_NOTES.md for details.
"@
$releaseReadme | Out-File ".\release\README.md" -Encoding utf8

$fileCount = (Get-ChildItem ".\release" -Recurse -File).Count
Write-Host "✓ Release artifacts created ($fileCount files)" -ForegroundColor Green
Write-Host ""

# Step 8: Create Git tag (optional)
if ($CreateTag) {
    Write-Host "[8/8] Creating Git tag..." -ForegroundColor Yellow
    
    $tagName = "v$Version"
    $tagExists = git tag -l $tagName
    
    if ($tagExists) {
        Write-Host "⚠ Tag $tagName already exists, skipping..." -ForegroundColor Yellow
    } else {
        git tag -a $tagName -m "Release version $Version"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Git tag created: $tagName" -ForegroundColor Green
            Write-Host "  Push with: git push origin $tagName" -ForegroundColor Cyan
        } else {
            Write-Host "✗ Failed to create Git tag" -ForegroundColor Red
        }
    }
} else {
    Write-Host "[8/8] Skipping Git tag creation" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Release artifacts available in: .\release\" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test installation: code --install-extension .\release\$vsixFile" -ForegroundColor White
Write-Host "  2. Verify functionality in VS Code" -ForegroundColor White
Write-Host "  3. Create GitHub release: gh release create v$Version .\release\* --notes-file .\release\RELEASE_NOTES.md" -ForegroundColor White
Write-Host "  4. Push tag: git push origin v$Version" -ForegroundColor White
Write-Host ""

# Display file list
Write-Host "Release contents:" -ForegroundColor Cyan
Get-ChildItem ".\release" -File | ForEach-Object {
    $size = if ($_.Length -lt 1KB) { "$($_.Length) B" } 
            elseif ($_.Length -lt 1MB) { "$([math]::Round($_.Length / 1KB, 2)) KB" }
            else { "$([math]::Round($_.Length / 1MB, 2)) MB" }
    Write-Host "  $($_.Name) ($size)" -ForegroundColor White
}
Write-Host ""
