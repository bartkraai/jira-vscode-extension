# Product Requirements Document: Jira VS Code Extension

## Overview

A VS Code extension that streamlines Jira workflow management directly within the development environment, reducing context switching and friction in ticket management, particularly for QA bug reporting and developer productivity.

## Goals

1. **Reduce friction** in creating bug reports and other Jira tickets
2. **Eliminate context switching** between VS Code and Jira web interface
3. **Integrate Jira workflows** with GitHub Copilot for intelligent automation
4. **Improve visibility** of assigned work without leaving the IDE

## Target Users

- **QA Engineers**: Need to quickly file bugs against features during testing
- **Developers**: Need to view assigned tickets and update status during development
- **Team Members**: Anyone who interacts with Jira tickets as part of daily workflow

## Core Features

### 1. My Work View

**Priority: P0 (MVP)**

A tree view panel in VS Code's sidebar displaying all tickets assigned to the current user.

**Requirements:**
- Display tickets grouped by status (To Do, In Progress, In Review, Done, etc.)
- Show key ticket information:
  - Ticket ID and title
  - Status
  - Priority indicator
  - Sprint/Epic context (if applicable)
- Quick actions per ticket:
  - View in Jira (opens browser)
  - Change status (inline dropdown or context menu)
  - Add comment
  - Copy ticket ID
- Refresh capability (manual and auto-refresh on interval)
- Filter options:
  - By ticket type (bug, story, task, etc.)
  - By sprint
  - By priority

**UI/UX:**
- Clean, scannable list interface
- Color coding for priority levels
- Icons for ticket types
- Collapsible status groups

### 2. Quick Ticket Creation

**Priority: P0 (MVP)**

Streamlined ticket creation workflows accessible via command palette, sidebar button, or keyboard shortcut.

**Ticket Types:**

#### Bug Against Feature
- Dropdown/autocomplete to select target feature
- Pre-populate fields:
  - Project
  - Ticket type (Bug)
  - Feature link/epic
  - Reporter (current user)
- Required fields:
  - Title/Summary
  - Description
  - Feature assignment
- Optional fields as needed by team process

#### Internal Defect
- Generic bug not tied to a specific feature
- Simplified field set
- Quick creation for ad-hoc issues

#### Other Ticket Types
- Support for creating Stories, Tasks, Subtasks
- Configurable based on team's Jira project setup

**UI/UX:**
- Modal or webview form
- Smart defaults to minimize data entry
- Field validation before submission
- Success notification with link to created ticket
- Option to automatically add created ticket to "My Work" view

### 3. Investigate with Copilot

**Priority: P0 (MVP)**

Context menu integration that sends ticket information to GitHub Copilot for development assistance.

**Requirements:**
- Right-click context menu option on any ticket: "Investigate with Copilot"
- Fetch full ticket details via Jira REST API:
  - Title and description
  - Acceptance criteria
  - Comments and discussion
  - Related tickets/dependencies
  - Attachments metadata (links)
- Generate markdown file with structured ticket information
- Save to workspace (e.g., `.jira/TICKET-123.md` or configurable location)
- Markdown format optimized for Copilot context:
  ```markdown
  # [TICKET-123] Title

  ## Description
  [Full description]

  ## Acceptance Criteria
  [Criteria list]

  ## Discussion
  [Relevant comments]

  ## Related
  - [Links to related tickets]

  ## Jira Link
  [Direct link to ticket]
  ```
- Add to Copilot workspace context automatically
- Notification to user when context file is ready

**Technical Notes:**
- Reuse existing REST API integration code
- Consider caching to avoid redundant API calls
- Handle API errors gracefully

### 4. Copilot Tools Integration

**Priority: P1 (Post-MVP)**

Expose Jira operations as Language Model Tools that GitHub Copilot can invoke autonomously or suggest to the user.

**Available Tools:**

#### Add Comment to Ticket
- **Input**: Ticket ID, comment text
- **Output**: Comment ID, success status
- **Use case**: Copilot adds commit details or progress updates

#### Update Ticket Status
- **Input**: Ticket ID, new status
- **Output**: Success status
- **Use case**: Move ticket to "In Review" when PR created

#### Link PR to Ticket
- **Input**: Ticket ID, PR URL
- **Output**: Success status
- **Use case**: Automatically link GitHub PR to Jira ticket

#### Create Subtask
- **Input**: Parent ticket ID, subtask title, description
- **Output**: New ticket ID
- **Use case**: Break down work identified during development

#### Log Time (Optional)
- **Input**: Ticket ID, time spent, work description
- **Output**: Success status
- **Use case**: Automatic time tracking based on commits

**Copilot Integration Pattern:**
- User commits code while working on JIRA-123
- Copilot (with context): "I've noticed you committed a fix. Should I update JIRA-123 with the commit details and move it to 'In Review'?"
- User confirms or Copilot executes automatically based on configuration

**Technical Requirements:**
- Implement VS Code Language Model Tools API
- Provide clear tool descriptions for Copilot to understand when to use
- Handle permissions and authentication
- Implement confirmation flows for destructive operations
- Graceful error handling and user feedback

## Technical Architecture

### VS Code Extension Components

1. **Extension Activation**
   - Activate on workspace open if Jira configuration present
   - Register commands, views, and providers

2. **Tree View Provider**
   - Implements `vscode.TreeDataProvider`
   - Manages ticket list state and updates
   - Handles expand/collapse and refresh

3. **Jira API Client**
   - REST API integration (reuse existing code)
   - Authentication handling (API tokens via VS Code secret storage)
   - Rate limiting and error handling
   - Response caching for performance

4. **Webview Provider (if needed)**
   - Rich UI for ticket creation forms
   - Ticket detail views

5. **Command Handlers**
   - Quick create commands
   - Status updates
   - Investigate with Copilot
   - Refresh actions

6. **Copilot Tools Provider**
   - Register Language Model Tools
   - Tool execution handlers
   - Context management

### Configuration

Store in VS Code settings (`.vscode/settings.json` or user settings):

```json
{
  "jiraExtension.instanceUrl": "https://company.atlassian.net",
  "jiraExtension.projectKey": "PROJ",
  "jiraExtension.featureEpics": ["PROJ-1", "PROJ-2"],
  "jiraExtension.defaultAssignee": "currentUser",
  "jiraExtension.autoRefreshInterval": 300,
  "jiraExtension.contextFileLocation": ".jira",
  "jiraExtension.enableCopilotTools": true
}
```

Authentication token stored securely in VS Code's secret storage (not in settings file).

### Dependencies

- VS Code Extension API
- Jira REST API client
- GitHub Copilot Extension API (for tools integration)
- Markdown generation library (if needed)

## User Workflows

### QA Testing Workflow
1. QA is testing Feature X
2. Discovers a bug
3. Opens Command Palette → "Jira: Create Bug Against Feature"
4. Selects Feature X from dropdown
5. Fills in title and description (minimal fields)
6. Submits
7. Bug is created and appears in their "My Work" view
8. **Result**: Bug filed in <30 seconds without leaving VS Code

### Developer Daily Workflow
1. Opens VS Code in morning
2. Checks "My Work" view in sidebar
3. Sees tickets assigned to them, grouped by status
4. Right-clicks ticket PROJ-123 → "Investigate with Copilot"
5. Extension generates markdown context file
6. Copilot now has full ticket context while coding
7. Commits fix, Copilot suggests: "Update PROJ-123 status to In Review?"
8. Confirms, Copilot adds comment and updates status
9. **Result**: Full workflow without opening Jira once

### Ad-hoc Bug Reporting
1. Developer notices internal issue not tied to feature
2. Command Palette → "Jira: Create Internal Defect"
3. Quick form with title/description
4. Submits
5. **Result**: Issue tracked without interrupting flow

## Success Metrics

- **Reduction in time to create bug tickets** (target: <30 seconds vs. 2-3 minutes)
- **Increase in bug reports filed** (measure adoption vs. OneNote usage)
- **Reduction in Jira web interface usage** during development hours
- **User satisfaction scores** from QA and dev teams
- **Copilot tool invocation rate** (measure automation usage)

## Security & Permissions

- API tokens stored in VS Code secret storage (encrypted)
- Never log or expose authentication credentials
- Respect Jira permissions (users can only see/modify tickets they have access to)
- Copilot tools should respect user permissions (no privilege escalation)

## Out of Scope (v1)

- Advanced JQL query builder
- Bulk operations (bulk status updates, mass create, etc.)
- Jira board/sprint management
- Time tracking visualization/reports
- Attachment upload/download
- Inline ticket editing (full form)
- Multi-project support (start with single project)
- Public marketplace release

## Future Considerations (v2+)

- **Smart notifications**: Desktop notifications for ticket updates
- **Inline comments**: View and reply to comments without context switch
- **Sprint planning**: Drag-and-drop tickets to sprints
- **GitHub integration**: Automatic PR → Ticket linking based on branch names
- **AI-powered ticket creation**: Copilot generates bug reports from error logs
- **Team view**: See tickets assigned to team members
- **Custom workflows**: Configurable status transitions based on team process
- **Analytics dashboard**: Personal productivity metrics

## Development Phases

### Phase 1: MVP (Week 1-2)
- My Work view
- Quick create (bug against feature, internal defect)
- Basic Jira API integration
- Investigate with Copilot

### Phase 2: Polish (Week 3)
- Filters and sorting
- Status updates
- Comment functionality
- Error handling and loading states

### Phase 3: Copilot Tools (Week 4)
- Language Model Tools API integration
- Tool implementations (comment, status update, link PR)
- Testing and refinement

## Acceptance Criteria

The extension is considered complete for v1 when:

1. ✅ Users can view all assigned tickets in VS Code sidebar
2. ✅ Users can create bug tickets against features in <30 seconds
3. ✅ Users can create internal defects quickly
4. ✅ Users can generate Copilot context files from tickets
5. ✅ Copilot can update ticket status and add comments via tools
6. ✅ Extension handles authentication securely
7. ✅ Error states are handled gracefully with user feedback
8. ✅ Extension works reliably with company's Jira instance

## Open Questions

- What are the exact required fields for bug tickets in your Jira project?
- Do you have specific feature epics/IDs that bugs should be linked to, or should we query these dynamically?
- Should we support multiple Jira projects or start with one?
- What status transitions are most common that we should prioritize?
- Are there custom fields your team uses that should be included?
- Should Copilot tools require confirmation or be fully autonomous (configurable)?

## References

- VS Code Extension API: https://code.visualstudio.com/api
- Jira REST API: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- GitHub Copilot Extensions: https://code.visualstudio.com/api/extension-guides/language-model
- Existing REST integration code (internal)
