# Release Artifacts for v0.2.0

This directory contains all artifacts for the 42-Jira-Buddy v0.2.0 release.

## Files Included

1. **42-jira-buddy-0.2.0.vsix** - Main extension package (241 KB)
2. **checksums.txt** - SHA256 checksums for verification
3. **RELEASE_NOTES.md** - User-facing release notes
4. **CHANGELOG.md** - Complete version history
5. **INSTALLATION.md** - Installation instructions

## Verification

To verify the VSIX integrity:

```bash
# Windows PowerShell
Get-FileHash 42-jira-buddy-0.2.0.vsix -Algorithm SHA256

# Linux/macOS
shasum -a 256 42-jira-buddy-0.2.0.vsix
```

Compare the output with the value in `checksums.txt`.

## Installation

See [INSTALLATION.md](./INSTALLATION.md) for detailed installation instructions.

## Source Code

- **Repository:** https://github.com/bartkraai/jira-vscode-extension
- **Tag:** v0.2.0
- **Commit:** 4b152e2

## Requirements

- VS Code: ^1.85.0 or higher
- Jira Cloud instance with REST API v3 access
- Valid Jira API token
