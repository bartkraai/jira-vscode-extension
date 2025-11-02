# Jira VS Code Extension

Seamless Jira integration for VS Code with GitHub Copilot support.

## Features

- View assigned Jira tickets directly in VS Code
- Quick ticket creation (bugs, stories, tasks)
- Investigate tickets with GitHub Copilot
- Update issue status and add comments
- GitHub Copilot tools for Jira automation

## Development

### Prerequisites

- Node.js 18+
- VS Code 1.85.0+

### Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile TypeScript:
   ```bash
   npm run compile
   ```

3. Run the extension:
   - Press `F5` in VS Code to open Extension Development Host
   - Or use the "Run Extension" debug configuration

### Project Structure

```
/src
  /api          # Jira API client and authentication
  /commands     # Command handlers
  /providers    # Tree view and webview providers
  /models       # TypeScript interfaces/types
  /utils        # Helper functions
  /config       # Configuration management
  /test         # Test files
/resources      # Icons and images
/out            # Compiled JavaScript (gitignored)
```

### Available Scripts

- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch mode for development
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Documentation

- [Feature Specifications](./FEATURES.md)
- [Epic Breakdown](./epics.md)
- [TODO List](./TODO.md)
- [Agent Guidelines](./CLAUDE.md)
- [Product Requirements](./jira-vscode-extension-prd.md)

## License

MIT
