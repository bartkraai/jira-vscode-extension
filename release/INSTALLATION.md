# Installation Guide - 42-Jira-Buddy v0.2.0

## Prerequisites

Before installing 42-Jira-Buddy, ensure you have:

- **VS Code:** Version 1.85.0 or higher
- **Jira Cloud:** Active Jira Cloud instance
- **API Token:** Generated from https://id.atlassian.com/manage-profile/security/api-tokens

## Installation Methods

### Method 1: Install from VSIX (Recommended)

#### Using Command Line
```bash
# Navigate to the directory containing the VSIX file
cd path/to/release

# Install the extension
code --install-extension 42-jira-buddy-0.2.0.vsix
```

#### Using VS Code UI
1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS) to open Extensions
3. Click the **"..."** menu (three dots) in the top right
4. Select **"Install from VSIX..."**
5. Navigate to and select `42-jira-buddy-0.2.0.vsix`
6. Click **"Install"**
7. Reload VS Code when prompted

### Method 2: Install from VS Code Marketplace (When Published)

1. Open VS Code Extensions (`Ctrl+Shift+X`)
2. Search for **"42-Jira-Buddy"**
3. Click **"Install"**

## Initial Configuration

After installation, configure the extension:

### 1. Set Jira Instance URL

```bash
# Open Command Palette (Ctrl+Shift+P)
# Type: "Jira: Configure"
```

Or manually add to `settings.json`:
```json
{
  "jiraExtension.instanceUrl": "https://your-instance.atlassian.net"
}
```

### 2. Authenticate

```bash
# Open Command Palette (Ctrl+Shift+P)
# Type: "Jira: Authenticate"
```

Enter:
- **Email:** Your Jira account email
- **API Token:** Token from https://id.atlassian.com/manage-profile/security/api-tokens

> **Security Note:** Credentials are stored securely using VS Code's Secret Storage API. They are never written to settings files.

### 3. Optional Configuration

Add to your `settings.json`:

```json
{
  "jiraExtension.projectKey": "PROJ",
  "jiraExtension.autoRefreshInterval": 300,
  "jiraExtension.contextFileLocation": ".jira",
  "jiraExtension.enableCopilotTools": true,
  "jiraExtension.maxIssues": 100
}
```

## Verification

### 1. Check Installation
```bash
code --list-extensions | findstr jira
```

Expected output:
```
your-publisher-name.42-jira-buddy
```

### 2. Verify Tools Available

Open a GitHub Copilot chat and try:
```
@github Create an epic in project DEMO called "Test Epic"
```

If configured correctly, Copilot will use the `jira_create_epic` tool.

### 3. Check Tree View

1. Open the **"Jira: My Work"** view in the sidebar
2. You should see your assigned issues (after authentication)

## Troubleshooting

### Extension Not Loading

1. Check VS Code version: `code --version`
2. Ensure it's >= 1.85.0
3. Reload VS Code: `Developer: Reload Window`

### Authentication Failed

1. Verify Jira instance URL (must be https)
2. Regenerate API token: https://id.atlassian.com/manage-profile/security/api-tokens
3. Run `Jira: Authenticate` again

### Tools Not Available to Copilot

1. Ensure `jiraExtension.enableCopilotTools` is `true`
2. Reload VS Code
3. Check GitHub Copilot is active
4. Try mentioning tools explicitly in Copilot chat

### Performance Issues

1. Reduce `jiraExtension.maxIssues` (default: 100)
2. Increase `jiraExtension.autoRefreshInterval` (default: 300 seconds)
3. Clear cache: Run `Jira: Clear Cache`

## Uninstallation

### Remove Extension
```bash
code --uninstall-extension your-publisher-name.42-jira-buddy
```

### Clear Stored Credentials
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type: `Developer: Clear Secret Storage`
3. Confirm deletion

### Remove Configuration
Remove these lines from `settings.json`:
```json
"jiraExtension.instanceUrl": "...",
"jiraExtension.projectKey": "...",
// ... other jiraExtension.* settings
```

## Upgrading from v0.1.0

No breaking changes! Simply:
1. Install v0.2.0 VSIX (overwrites v0.1.0)
2. Reload VS Code
3. All existing configurations and credentials remain intact

New features are automatically available.

## Support

- **Issues:** https://github.com/bartkraai/jira-vscode-extension/issues
- **Documentation:** See README.md in repository
- **Changelog:** See CHANGELOG.md for version history

## Next Steps

After installation:
1. Explore the **"Jira: My Work"** sidebar
2. Try creating issues with Copilot
3. Use keyboard shortcuts (see README.md)
4. Read FEATURES.md for advanced capabilities

Happy tracking! 🎯
