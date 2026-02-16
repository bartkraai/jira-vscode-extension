# 42-Jira-Buddy

Your friendly Jira companion for VS Code with GitHub Copilot support.

## Features

### 🎯 Core Capabilities
- **View assigned Jira tickets** directly in VS Code sidebar
- **Quick ticket creation** - bugs, stories, tasks, epics in under 30 seconds
- **Investigate with GitHub Copilot** - AI-powered issue analysis
- **Comprehensive project management** - full Jira workflow from VS Code

### 🤖 GitHub Copilot Integration

42-Jira-Buddy provides **22 specialized tools** that let GitHub Copilot manage your Jira workflow through natural language:

#### Issue Creation
- `jira_create_epic` - Create high-level initiatives and features
- `jira_create_story` - Create user stories with optional epic linking
- `jira_create_task` - Create standalone or child tasks
- `jira_create_bug` - Report bugs with priority levels
- `jira_create_subtask` - Break down work into smaller tasks

#### Issue Management
- `jira_get_issue_info` - Retrieve comprehensive issue details
- `jira_assign_issue` - Assign or unassign issues to team members
- `jira_set_priority` - Update issue priority (Critical, High, Medium, Low)
- `jira_add_comment` - Add comments and updates
- `jira_update_status` - Transition issues through workflow
- `jira_add_labels` - Tag issues for organization
- `jira_log_time` - Track time spent on issues

#### Project Organization
- `jira_list_epics` - View all epics in a project
- `jira_get_project` - Retrieve project details and metadata
- `jira_search_issues` - Advanced JQL-based issue search
- `jira_link_issues` - Create relationships (Blocks, Relates, Duplicates)
- `jira_set_sprint` - Move issues to sprints
- `jira_get_transitions` - View available workflow transitions

#### Development Integration
- `jira_link_pr` - Associate pull requests with issues
- `jira_add_watcher` - Subscribe users to issue notifications
- `jira_bulk_update` - Update multiple issues simultaneously

**Example Copilot prompts:**
- "Create an epic for the new authentication feature in project DEMO"
- "List all high-priority bugs assigned to me"
- "Add a comment to DEMO-123 documenting my progress"
- "Move DEMO-456 to In Progress and assign it to me"
- "Find all open stories in the mobile-app epic"

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Refresh issues | `Ctrl+Shift+R` | `Cmd+Shift+R` |
| Open selected issue in Jira | `Enter` | `Enter` |
| Search/Filter issues | `Ctrl+Shift+F` | `Cmd+Shift+F` |

Note: Keyboard shortcuts work when the Jira My Work view is focused.

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
