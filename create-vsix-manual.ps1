# Manual VSIX Creation Script for 42-Jira-Buddy v0.2.0
# Use this when disk space is limited and vsce cannot be installed

Write-Host "Creating VSIX package for 42-Jira-Buddy v0.2.0..." -ForegroundColor Cyan

# Navigate to project root
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# Verify compiled output exists
if (-not (Test-Path ".\out\extension.js")) {
    Write-Host "ERROR: Compiled extension not found. Run 'npm run compile' first." -ForegroundColor Red
    exit 1
}

# Create temporary directory structure
$temp = ".\vsix-temp"
$extDir = "$temp\extension"

Write-Host "Creating temporary directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $extDir | Out-Null

# Copy essential files
Write-Host "Copying extension files..." -ForegroundColor Yellow
Copy-Item ".\out" -Destination $extDir -Recurse -Force
Copy-Item ".\package.json" -Destination $extDir -Force
Copy-Item ".\README.md" -Destination $extDir -Force -ErrorAction SilentlyContinue
Copy-Item ".\CHANGELOG.md" -Destination $extDir -Force -ErrorAction SilentlyContinue
Copy-Item ".\LICENSE" -Destination $extDir -Force -ErrorAction SilentlyContinue

# Copy resources if they exist
if (Test-Path ".\resources") {
    Copy-Item ".\resources" -Destination $extDir -Recurse -Force
}

# Create [Content_Types].xml
Write-Host "Creating manifest files..." -ForegroundColor Yellow
$contentTypes = @'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".md" ContentType="text/markdown"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>
'@
$contentTypes | Out-File -FilePath "$temp\[Content_Types].xml" -Encoding utf8 -NoNewline

# Create extension.vsixmanifest
$vsixManifest = @'
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Id="42-jira-buddy" Version="0.2.0" Language="en-US" Publisher="your-publisher-name"/>
    <DisplayName>42-Jira-Buddy</DisplayName>
    <Description>Your friendly Jira companion for VS Code with GitHub Copilot support. Includes 22 tools for GitHub Copilot to manage your entire Jira workflow through natural language.</Description>
    <Tags>jira,copilot,github,productivity,project-management,agile,scrum</Tags>
    <Categories>Other</Categories>
    <License>extension/LICENSE</License>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" Version="[1.85.0,)"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json"/>
  </Assets>
</PackageManifest>
'@
$vsixManifest | Out-File -FilePath "$temp\extension.vsixmanifest" -Encoding utf8 -NoNewline

# Create VSIX (it's a ZIP file with .vsix extension)
$vsixName = "42-jira-buddy-0.2.0.vsix"
$zipName = "42-jira-buddy-0.2.0.zip"

Write-Host "Packaging extension..." -ForegroundColor Yellow

# Remove existing files if they exist
if (Test-Path $vsixName) { Remove-Item $vsixName -Force }
if (Test-Path $zipName) { Remove-Item $zipName -Force }

# Create ZIP archive
Compress-Archive -Path "$temp\*" -DestinationPath $zipName -Force -CompressionLevel Optimal

# Rename to .vsix
Rename-Item $zipName $vsixName -Force

# Cleanup temporary directory
Write-Host "Cleaning up..." -ForegroundColor Yellow
Remove-Item $temp -Recurse -Force

# Verify VSIX was created
if (Test-Path $vsixName) {
    $fileSize = (Get-Item $vsixName).Length / 1KB
    Write-Host "`n✓ SUCCESS!" -ForegroundColor Green
    Write-Host "VSIX created: $vsixName ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
    Write-Host "`nTo install, run:" -ForegroundColor Cyan
    Write-Host "  code --install-extension $vsixName" -ForegroundColor White
    Write-Host "`nOr in VS Code:" -ForegroundColor Cyan
    Write-Host "  1. Extensions (Ctrl+Shift+X)" -ForegroundColor White
    Write-Host "  2. '...' menu → 'Install from VSIX...'" -ForegroundColor White
    Write-Host "  3. Select $vsixName" -ForegroundColor White
} else {
    Write-Host "`n✗ ERROR: VSIX creation failed" -ForegroundColor Red
    exit 1
}
