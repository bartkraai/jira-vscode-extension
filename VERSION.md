# Version 0.2.0

## Release Date: February 16, 2026

## Major Changes

This release significantly expands GitHub Copilot integration with 16 new tools and migrates to Jira REST API v3 for future-proof compatibility.

### What's New

- **22 GitHub Copilot Tools** - Complete Jira workflow automation through natural language
- **Jira REST API v3** - Latest API version with enhanced ADF support
- **Enhanced Tool Descriptions** - Optimized for AI agent understanding and usage
- **Comprehensive Project Management** - Full CRUD operations for epics, stories, tasks, bugs

### Breaking Changes

None - This release maintains backward compatibility with v0.1.0

### Migration Guide

If upgrading from 0.1.0:
1. No configuration changes required
2. Existing credentials will continue to work
3. All v0.1.0 tools remain functional
4. New tools are immediately available to GitHub Copilot

### Known Issues

- None at release time

### System Requirements

- VS Code: ^1.85.0 or higher
- Node.js: 18.x or higher (for development)
- Jira Cloud instance with REST API v3 support

### Installation

```bash
# From VS Code Marketplace
code --install-extension your-publisher-name.42-jira-buddy

# Or search "42-Jira-Buddy" in VS Code Extensions
```

### Next Steps

See [CHANGELOG.md](./CHANGELOG.md) for complete details.
