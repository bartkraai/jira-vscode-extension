# Creating VSIX Package for 42-Jira-Buddy

## Current Issue
Your system is low on disk space. The `vsce` tool requires temporary space for packaging.

## Solution 1: Free Disk Space and Use vsce (Recommended)

### Free up disk space:
1. Clear temporary files: Run Disk Cleanup
2. Empty Recycle Bin
3. Clear npm cache: `npm cache clean --force`
4. Clear VS Code extension cache in `%USERPROFILE%\.vscode\extensions`

### Then create VSIX:
```powershell
# Option A: Using npx (no install needed)
npx @vscode/vsce package

# Option B: Install locally and use
npm install --save-dev @vscode/vsce
npx vsce package

# Option C: Install globally
npm install -g @vscode/vsce
vsce package
```

This will create: `42-jira-buddy-0.2.0.vsix`

## Solution 2: Manual VSIX Creation

A VSIX is essentially a ZIP file with a specific structure. Here's how to create one manually:

### Structure Required:
```
42-jira-buddy-0.2.0.vsix
├── extension/
│   ├── out/
│   │   └── extension.js (your compiled code)
│   ├── resources/ (if any)
│   ├── package.json
│   ├── README.md
│   ├── CHANGELOG.md
│   └── LICENSE
├── extension.vsixmanifest
└── [Content_Types].xml
```

### PowerShell Script to Create VSIX Manually:
```powershell
# Navigate to project root
cd C:\.GitHub\jira-vscode-extension

# Create temporary directory structure
$temp = ".\vsix-temp"
$extDir = "$temp\extension"
New-Item -ItemType Directory -Force -Path $extDir

# Copy essential files
Copy-Item ".\out" -Destination $extDir -Recurse
Copy-Item ".\package.json" -Destination $extDir
Copy-Item ".\README.md" -Destination $extDir -ErrorAction SilentlyContinue
Copy-Item ".\CHANGELOG.md" -Destination $extDir -ErrorAction SilentlyContinue
Copy-Item ".\LICENSE" -Destination $extDir -ErrorAction SilentlyContinue
Copy-Item ".\resources" -Destination $extDir -Recurse -ErrorAction SilentlyContinue

# Create [Content_Types].xml
@'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>
'@ | Out-File -FilePath "$temp\[Content_Types].xml" -Encoding utf8

# Create extension.vsixmanifest
@'
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Id="42-jira-buddy" Version="0.2.0" Language="en-US" Publisher="your-publisher-name"/>
    <DisplayName>42-Jira-Buddy</DisplayName>
    <Description>Your friendly Jira companion for VS Code with GitHub Copilot support</Description>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json"/>
  </Assets>
</PackageManifest>
'@ | Out-File -FilePath "$temp\extension.vsixmanifest" -Encoding utf8

# Create VSIX (it's a ZIP file)
Compress-Archive -Path "$temp\*" -DestinationPath "42-jira-buddy-0.2.0.zip" -Force
Rename-Item "42-jira-buddy-0.2.0.zip" "42-jira-buddy-0.2.0.vsix" -Force

# Cleanup
Remove-Item $temp -Recurse -Force

Write-Host "VSIX created: 42-jira-buddy-0.2.0.vsix" -ForegroundColor Green
```

Save the above as `create-vsix-manual.ps1` and run: `.\create-vsix-manual.ps1`

## Solution 3: Use Different Machine

If disk space cannot be freed:
1. Push code to Git repository
2. Clone on machine with sufficient disk space
3. Run `npm install` and `npx @vscode/vsce package`

## Installation After VSIX Creation

```bash
# Install the VSIX
code --install-extension 42-jira-buddy-0.2.0.vsix

# Or in VS Code:
# 1. Open Extensions (Ctrl+Shift+X)
# 2. Click "..." menu
# 3. Select "Install from VSIX..."
# 4. Choose the .vsix file
```

## Verify Installation

```bash
code --list-extensions | findstr jira
```

Should show: `your-publisher-name.42-jira-buddy`

## Notes

- The compiled extension is already built at `out/extension.js` (441 KB)
- All source files are compiled and ready
- VSIX is just a specially formatted ZIP containing your extension
- Manual creation works but `vsce` is recommended as it validates everything
