# Jira VS Code Extension - Development Epics

This document breaks down the PRD into actionable development epics with clear acceptance criteria and dependencies.

---

## Epic 1: Extension Foundation & Setup

**Priority:** P0 (Prerequisite)
**Phase:** Week 1
**Estimated Effort:** 2-3 days

### Description
Set up the VS Code extension project structure, development environment, build pipeline, and basic extension activation.

### Stories/Tasks
- Initialize VS Code extension project with Yeoman generator or manual setup
- Configure TypeScript build system and webpack bundling
- Set up ESLint, Prettier, and code quality tools
- Create extension manifest (`package.json`) with basic metadata
- Implement extension activation logic (activate on workspace open)
- Set up development/debug configuration for testing
- Configure VS Code extension test runner
- Create basic README with development setup instructions
- Set up Git repository and initial commit structure

### Acceptance Criteria
- ✅ Extension loads successfully in VS Code development environment
- ✅ Extension activates when workspace is opened
- ✅ Build system compiles TypeScript without errors
- ✅ Development workflow documented in README
- ✅ Basic test infrastructure in place

### Dependencies
None

---

## Epic 2: Jira API Integration & Authentication

**Priority:** P0 (Critical Path)
**Phase:** Week 1
**Estimated Effort:** 3-4 days

### Description
Implement secure authentication with Jira and create a reusable API client for all Jira operations.

### Stories/Tasks
- Create Jira API client class with TypeScript interfaces
- Implement authentication flow:
  - Prompt user for Jira instance URL
  - Prompt for API token
  - Store credentials in VS Code secret storage (not settings)
- Implement API methods:
  - `getAssignedIssues()` - fetch user's tickets
  - `getIssueDetails(issueKey)` - fetch full ticket details
  - `createIssue(issueData)` - create new ticket
  - `updateIssueStatus(issueKey, status)` - transition ticket
  - `addComment(issueKey, comment)` - add comment to ticket
  - `getProjects()` - fetch available projects
  - `getIssueTypes()` - fetch issue types for project
- Implement error handling for API failures (401, 403, 404, 500)
- Implement rate limiting/throttling to respect Jira API limits
- Add response caching for frequently accessed data
- Create configuration validation (check if credentials/URL are valid)
- Write unit tests for API client

### Acceptance Criteria
- ✅ User can authenticate with Jira using API token
- ✅ Credentials stored securely in VS Code secret storage
- ✅ API client successfully fetches tickets from Jira
- ✅ Error handling provides clear user feedback
- ✅ API responses are cached appropriately
- ✅ Unit tests cover core API functionality

### Dependencies
- Epic 1: Extension Foundation

---

## Epic 3: Configuration Management

**Priority:** P0 (Critical Path)
**Phase:** Week 1
**Estimated Effort:** 2 days

### Description
Implement configuration system for Jira connection settings, project preferences, and extension behavior.

### Stories/Tasks
- Define configuration schema in `package.json`:
  - `jiraExtension.instanceUrl`
  - `jiraExtension.projectKey`
  - `jiraExtension.featureEpics`
  - `jiraExtension.defaultAssignee`
  - `jiraExtension.autoRefreshInterval`
  - `jiraExtension.contextFileLocation`
  - `jiraExtension.enableCopilotTools`
- Implement configuration access layer (wrapper around VS Code config API)
- Create "Configure Jira Extension" command for initial setup wizard
- Implement configuration validation on change
- Add configuration migration/upgrade logic for future versions
- Document all configuration options in README
- Provide default values for optional settings

### Acceptance Criteria
- ✅ User can configure extension via VS Code settings UI
- ✅ Initial setup wizard guides user through configuration
- ✅ Configuration changes are validated and applied immediately
- ✅ All configuration options documented
- ✅ Sensible defaults provided for optional settings

### Dependencies
- Epic 1: Extension Foundation

---

## Epic 4: My Work View - Tree View Implementation

**Priority:** P0 (MVP Core Feature)
**Phase:** Week 1-2
**Estimated Effort:** 4-5 days

### Description
Implement the sidebar tree view that displays all tickets assigned to the current user, grouped by status.

### Stories/Tasks
- Create `TreeDataProvider` implementation for Jira tickets
- Define tree item structure (status groups → tickets)
- Implement data fetching and tree population
- Add ticket metadata display:
  - Ticket ID and title
  - Status badge
  - Priority indicator with color coding
  - Issue type icon
  - Sprint/Epic context (if applicable)
- Implement collapsible status groups
- Add manual refresh button and auto-refresh on interval
- Implement loading states and spinners
- Add empty state messaging (no tickets assigned)
- Create icons/decorations for different ticket types and priorities
- Implement tree view context menu (right-click actions)
- Add "View in Jira" action (opens browser)
- Add "Copy Ticket ID" action

### Acceptance Criteria
- ✅ Tree view displays in VS Code activity bar/sidebar
- ✅ Tickets are grouped by status
- ✅ Ticket information is clearly displayed with proper formatting
- ✅ Tree refreshes automatically on configured interval
- ✅ Manual refresh works correctly
- ✅ Context menu actions functional
- ✅ Loading and empty states handled gracefully
- ✅ Color coding and icons improve readability

### Dependencies
- Epic 2: Jira API Integration
- Epic 3: Configuration Management

---

## Epic 5: My Work View - Filtering & Actions

**Priority:** P0 (MVP Core Feature)
**Phase:** Week 2
**Estimated Effort:** 2-3 days

### Description
Add filtering capabilities and quick actions to the My Work view.

### Stories/Tasks
- Implement filter UI in tree view toolbar:
  - Filter by ticket type (bug, story, task, etc.)
  - Filter by sprint
  - Filter by priority
- Add filter state persistence (remember user's filter choices)
- Implement "Change Status" action:
  - Show available status transitions
  - Quick picker dropdown
  - Update ticket via API
  - Refresh tree view after update
- Implement "Add Comment" action:
  - Input box for comment text
  - Submit comment to Jira
  - Show success notification
- Add keyboard shortcuts for common actions
- Implement search/filter input box in view toolbar

### Acceptance Criteria
- ✅ User can filter tickets by type, sprint, and priority
- ✅ Filters persist across VS Code sessions
- ✅ Status changes update Jira and refresh view
- ✅ Comments can be added to tickets
- ✅ Actions provide feedback (success/error notifications)
- ✅ Keyboard shortcuts work as expected

### Dependencies
- Epic 4: My Work View - Tree View Implementation

---

## Epic 6: Quick Ticket Creation - UI & Workflow

**Priority:** P0 (MVP Core Feature)
**Phase:** Week 2
**Estimated Effort:** 4-5 days

### Description
Implement streamlined ticket creation workflows for bugs, defects, and other issue types.

### Stories/Tasks
- Create webview panel for ticket creation form
- Design form UI with HTML/CSS (clean, VS Code themed)
- Implement "Create Bug Against Feature" workflow:
  - Dropdown/autocomplete for feature selection
  - Pre-populated fields (project, type, reporter)
  - Required fields: title, description, feature link
  - Optional fields based on Jira project configuration
- Implement "Create Internal Defect" workflow:
  - Simplified form (title, description only)
  - Quick creation without feature assignment
- Implement "Create Other Ticket Types" (Story, Task, Subtask):
  - Dynamic form based on issue type
  - Fetch required/optional fields from Jira
- Add field validation before submission
- Implement form submission logic
- Show success notification with link to created ticket
- Option to add created ticket to "My Work" view
- Register commands in command palette:
  - "Jira: Create Bug Against Feature"
  - "Jira: Create Internal Defect"
  - "Jira: Create Task"
  - "Jira: Create Story"
- Add keyboard shortcuts for quick access
- Add sidebar button for quick creation

### Acceptance Criteria
- ✅ Ticket creation forms display in webview
- ✅ Forms are pre-populated with smart defaults
- ✅ Field validation prevents invalid submissions
- ✅ Tickets are successfully created in Jira
- ✅ Success notifications show created ticket link
- ✅ Commands accessible via command palette and shortcuts
- ✅ Bug creation workflow takes <30 seconds
- ✅ Forms handle errors gracefully

### Dependencies
- Epic 2: Jira API Integration
- Epic 3: Configuration Management

---

## Epic 7: Investigate with Copilot

**Priority:** P0 (MVP Core Feature)
**Phase:** Week 2
**Estimated Effort:** 3 days

### Description
Implement context menu integration that fetches ticket details and generates markdown files optimized for Copilot context.

### Stories/Tasks
- Add "Investigate with Copilot" context menu action to tree view items
- Fetch full ticket details via Jira API:
  - Title and description
  - Acceptance criteria (if available)
  - Comments and discussion
  - Related tickets/dependencies
  - Attachments metadata
- Generate markdown file with structured format:
  - Title section
  - Description
  - Acceptance Criteria
  - Discussion/Comments
  - Related tickets
  - Direct Jira link
- Save markdown to configurable location (default: `.jira/TICKET-123.md`)
- Create `.jira` directory if it doesn't exist
- Add markdown file to Copilot workspace context
- Show notification when context file is ready
- Open markdown file in editor automatically (optional)
- Implement caching to avoid redundant API calls for same ticket
- Add command palette command: "Jira: Investigate Ticket with Copilot"

### Acceptance Criteria
- ✅ Context menu action available on all tickets
- ✅ Full ticket details fetched successfully
- ✅ Markdown file generated with proper formatting
- ✅ File saved to configured location
- ✅ Copilot can access ticket context from markdown
- ✅ User notified when context is ready
- ✅ Caching improves performance for repeated investigations
- ✅ Error handling for API failures

### Dependencies
- Epic 4: My Work View - Tree View Implementation
- Epic 2: Jira API Integration

---

## Epic 8: Copilot Tools Integration - Infrastructure

**Priority:** P1 (Post-MVP)
**Phase:** Week 4
**Estimated Effort:** 3-4 days

### Description
Set up Language Model Tools API integration and implement the infrastructure for Copilot to invoke Jira operations.

### Stories/Tasks
- Research VS Code Language Model Tools API
- Implement Language Model Tools Provider
- Register extension as Copilot tools provider
- Create tool registration system
- Implement tool invocation handler
- Create tool execution context (authentication, permissions)
- Implement confirmation flow for destructive operations
- Add configuration option to enable/disable Copilot tools
- Implement tool usage logging (for debugging/analytics)
- Create tool error handling and user feedback system
- Write documentation for tool usage

### Acceptance Criteria
- ✅ Extension registers as Copilot tools provider
- ✅ Tool infrastructure can execute commands
- ✅ Confirmation flows work for destructive actions
- ✅ Error handling provides clear feedback
- ✅ Tools can be enabled/disabled via configuration
- ✅ Tool execution is logged for debugging

### Dependencies
- Epic 2: Jira API Integration
- Epic 3: Configuration Management

---

## Epic 9: Copilot Tools - Tool Implementations

**Priority:** P1 (Post-MVP)
**Phase:** Week 4
**Estimated Effort:** 4-5 days

### Description
Implement specific Language Model Tools for common Jira operations that Copilot can invoke.

### Stories/Tasks
- Implement "Add Comment to Ticket" tool:
  - Input: ticket ID, comment text
  - Output: success status, comment ID
  - Use case: Copilot adds commit details
- Implement "Update Ticket Status" tool:
  - Input: ticket ID, new status
  - Output: success status
  - Use case: Move to "In Review" when PR created
- Implement "Link PR to Ticket" tool:
  - Input: ticket ID, PR URL
  - Output: success status
  - Use case: Auto-link GitHub PR
- Implement "Create Subtask" tool:
  - Input: parent ticket ID, subtask title, description
  - Output: new ticket ID
  - Use case: Break down work during development
- Implement "Log Time" tool (optional):
  - Input: ticket ID, time spent, work description
  - Output: success status
  - Use case: Automatic time tracking
- Write clear tool descriptions for Copilot
- Implement parameter validation for each tool
- Add unit tests for tool implementations
- Create user documentation with examples

### Acceptance Criteria
- ✅ All tools implemented and functional
- ✅ Tools have clear descriptions for Copilot
- ✅ Parameter validation prevents invalid operations
- ✅ Tools integrate seamlessly with Copilot chat
- ✅ User can confirm/cancel tool executions
- ✅ Success/failure feedback is clear
- ✅ Unit tests cover tool functionality

### Dependencies
- Epic 8: Copilot Tools Integration - Infrastructure

---

## Epic 10: Error Handling & Polish

**Priority:** P0 (Quality)
**Phase:** Week 3
**Estimated Effort:** 3-4 days

### Description
Implement comprehensive error handling, loading states, and polish the user experience.

### Stories/Tasks
- Implement global error handler for extension
- Add proper error messages for all API failure scenarios:
  - Authentication failures (401, 403)
  - Network errors
  - Jira instance unavailable
  - Rate limiting (429)
  - Invalid configuration
- Implement loading states for all async operations:
  - Spinners in tree view
  - Progress notifications for long operations
  - Webview loading states
- Add retry logic for transient failures
- Implement proper TypeScript error types
- Add telemetry for error tracking (optional, with user consent)
- Create user-friendly error messages (no stack traces)
- Implement graceful degradation when Jira is unavailable
- Add status bar item showing connection status
- Handle edge cases:
  - Empty responses
  - Malformed data
  - Expired authentication
- Write error handling tests

### Acceptance Criteria
- ✅ All error scenarios handled gracefully
- ✅ User receives clear, actionable error messages
- ✅ Loading states provide feedback during operations
- ✅ Extension doesn't crash on API failures
- ✅ Retry logic improves reliability
- ✅ Status bar shows connection health
- ✅ Edge cases handled without breaking functionality

### Dependencies
- All implementation epics

---

## Epic 11: Testing & Quality Assurance

**Priority:** P0 (Quality)
**Phase:** Week 3-4
**Estimated Effort:** 3-4 days

### Description
Comprehensive testing of all features and quality assurance.

### Stories/Tasks
- Write unit tests for:
  - Jira API client
  - Configuration management
  - Tree view provider logic
  - Ticket creation workflows
  - Copilot tools
- Write integration tests:
  - End-to-end ticket creation
  - Tree view refresh cycles
  - Status updates
- Create test Jira instance or mock API for testing
- Manual testing checklist:
  - All user workflows from PRD
  - Error scenarios
  - Performance with large ticket lists
  - Cross-platform testing (Windows, Mac, Linux)
- Performance testing:
  - Tree view with 100+ tickets
  - API response time monitoring
  - Memory usage profiling
- Security review:
  - Credential storage audit
  - API token handling review
  - Input validation audit
- Code review and refactoring
- Update documentation based on testing findings

### Acceptance Criteria
- ✅ Unit test coverage >70%
- ✅ All critical paths have integration tests
- ✅ Manual testing checklist completed
- ✅ Performance benchmarks met
- ✅ Security review passed
- ✅ No critical bugs in MVP features
- ✅ Extension works on Windows, Mac, and Linux

### Dependencies
- All implementation epics

---

## Epic 12: Documentation & Release Preparation

**Priority:** P0 (Release)
**Phase:** Week 4
**Estimated Effort:** 2-3 days

### Description
Complete user-facing documentation, prepare for initial release, and package the extension.

### Stories/Tasks
- Write comprehensive README:
  - Feature overview
  - Installation instructions
  - Configuration guide
  - Usage examples
  - Screenshots/GIFs
  - Troubleshooting section
- Create CHANGELOG documenting v1.0 features
- Write configuration reference documentation
- Create example configuration files
- Write Copilot tools usage guide
- Create tutorial/getting started guide
- Add LICENSE file
- Package extension as VSIX
- Test installation from VSIX
- Prepare internal deployment plan (not public marketplace)
- Create feedback/issue reporting process
- Write developer contribution guide (if open to contributions)

### Acceptance Criteria
- ✅ README is complete and accurate
- ✅ All features documented with examples
- ✅ Configuration guide is clear
- ✅ VSIX package installs correctly
- ✅ Troubleshooting section addresses common issues
- ✅ Release artifacts prepared
- ✅ Deployment plan finalized

### Dependencies
- All implementation epics
- Epic 11: Testing & Quality Assurance

---

## Priority Summary

### P0 (MVP - Must Have)
1. Extension Foundation & Setup
2. Jira API Integration & Authentication
3. Configuration Management
4. My Work View - Tree View Implementation
5. My Work View - Filtering & Actions
6. Quick Ticket Creation - UI & Workflow
7. Investigate with Copilot
8. Error Handling & Polish
9. Testing & Quality Assurance
10. Documentation & Release Preparation

### P1 (Post-MVP - Should Have)
1. Copilot Tools Integration - Infrastructure
2. Copilot Tools - Tool Implementations

---

## Development Timeline

### Week 1: Foundation & Core Infrastructure
- Epic 1: Extension Foundation (Days 1-2)
- Epic 2: Jira API Integration (Days 2-5)
- Epic 3: Configuration Management (Days 3-4)
- Epic 4: My Work View Start (Days 5+)

### Week 2: MVP Features
- Epic 4: My Work View Complete (Days 1-2)
- Epic 5: Filtering & Actions (Days 2-3)
- Epic 6: Quick Ticket Creation (Days 3-5)
- Epic 7: Investigate with Copilot (Days 5+)

### Week 3: Polish & Quality
- Epic 7: Complete Investigate with Copilot (Day 1)
- Epic 10: Error Handling & Polish (Days 1-3)
- Epic 11: Testing Start (Days 3+)

### Week 4: Advanced Features & Release
- Epic 11: Testing Complete (Days 1-2)
- Epic 8: Copilot Tools Infrastructure (Days 2-3)
- Epic 9: Copilot Tools Implementation (Days 3-5)
- Epic 12: Documentation & Release (Days 5+)

---

## Success Metrics per Epic

Each epic should track:
- Development time (actual vs. estimated)
- Test coverage percentage
- Number of bugs found in testing
- User feedback score (post-release)
- Performance benchmarks (where applicable)

---

## Risk & Mitigation

### High Risk Areas
1. **Jira API Rate Limiting** - Implement aggressive caching and request throttling
2. **Copilot Tools API Changes** - Monitor VS Code API changelog, implement feature flags
3. **Authentication Security** - Use VS Code secret storage, never log credentials
4. **Performance with Large Datasets** - Implement pagination, lazy loading, and virtualization

### Mitigation Strategies
- Build API client with retry and fallback logic
- Create feature toggles for experimental features
- Implement comprehensive error handling early
- Performance test with realistic data volumes
