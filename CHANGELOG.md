# Changelog

All notable changes to the "42-Jira-Buddy" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-16

### Added
- **16 New GitHub Copilot Tools** for comprehensive Jira management:
  - `jira_create_epic` - Create epics for organizing work
  - `jira_create_task` - Create standalone or child tasks
  - `jira_create_story` - Create user stories with epic linking
  - `jira_create_bug` - Create bug reports with priority
  - `jira_list_epics` - List all epics in a project
  - `jira_assign_issue` - Assign or unassign issues
  - `jira_set_priority` - Change issue priority levels
  - `jira_add_watcher` - Subscribe users to issue notifications
  - `jira_search_issues` - Advanced JQL-based issue search
  - `jira_get_project` - Retrieve project details and metadata
  - `jira_link_issues` - Create relationships between issues
  - `jira_add_labels` - Tag issues with custom labels
  - `jira_set_sprint` - Move issues to sprints
  - `jira_get_transitions` - View available status transitions
  - `jira_bulk_update` - Update multiple issues at once

### Changed
- **Migrated to Jira REST API v3** (from v2) for future-proof compatibility
  - Better support for Atlassian Document Format (ADF)
  - Access to latest API features
  - Maintained backward compatibility
- **Enhanced tool descriptions** for GitHub Copilot with:
  - Clearer use case explanations
  - Input/output specifications
  - Contextual guidance on when to use each tool
  - Better examples and formatting

### Improved
- Updated documentation (AGENTS.md, CLAUDE.md) with v3 API guidance
- Added `lead` property to JiraProject interface for project details
- Enhanced JiraClient with 10 new methods:
  - `getEpics()` - Search for project epics
  - `assignIssue()` - Manage issue assignment
  - `setPriority()` - Update priority levels
  - `addWatcher()` - Add watchers to issues
  - `searchIssues()` - General JQL search
  - `getProjectDetails()` - Fetch project information
  - `linkIssues()` - Create issue links
  - `addLabels()` - Add labels to issues
  - `moveToSprint()` - Sprint assignment
  - `bulkUpdateIssues()` - Batch updates

### Technical
- All tools properly registered in extension activation
- Complete TypeScript type safety maintained
- JSON schema validation for all tool inputs
- Comprehensive error handling and user feedback

## [0.1.0] - Initial Release

### Added
- Initial extension setup with Jira authentication
- Basic Copilot tools:
  - `jira_get_issue_info` - Get issue details
  - `jira_add_comment` - Add comments
  - `jira_update_status` - Update status
  - `jira_link_pr` - Link pull requests
  - `jira_create_subtask` - Create subtasks
  - `jira_log_time` - Log work time
- Tree view for "My Work"
- Secure credential storage using VS Code Secret Storage
- Configuration management

[0.2.0]: https://github.com/your-publisher-name/jira-vscode-extension/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-publisher-name/jira-vscode-extension/releases/tag/v0.1.0
