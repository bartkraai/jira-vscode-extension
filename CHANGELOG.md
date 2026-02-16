# Changelog

All notable changes to the "42-Jira-Buddy" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.3] - 2026-02-16

### Fixed
- **Custom Fields in Creation Tools**: Added missing `customFields` parameter to package.json schemas
  - All 5 creation tools now properly expose customFields parameter to Copilot
  - `jira_create_epic` - Now shows customFields option
  - `jira_create_story` - Now shows customFields option
  - `jira_create_task` - Now shows customFields option
  - `jira_create_bug` - Now shows customFields option
  - `jira_create_subtask` - Now shows customFields option
  - Tools had the functionality in code but Copilot couldn't see the parameter

### Enhanced
- **Tool Descriptions**: Updated modelDescription for all creation tools to mention custom fields support
- **Parameter Guidance**: Added detailed examples in customFields description showing how to use with jira_get_custom_fields and jira_get_custom_field_values

## [0.3.2] - 2026-02-16

### Fixed
- **Tool Visibility**: Added missing package.json declarations for custom field tools
  - `jira_get_custom_fields` now properly appears in Copilot's tool list
  - `jira_get_custom_field_values` now properly appears in Copilot's tool list
  - Tools were registering at runtime but invisible to Copilot without package.json contribution

### Documentation
- **Critical Reminder Added**: Updated AGENTS.md and CLAUDE.md with comprehensive Language Model Tools section
  - Added clear warning that tools require BOTH runtime registration AND package.json declaration
  - Added complete checklist for creating new Copilot tools
  - Added to Common Pitfalls section to prevent future mistakes

## [0.3.1] - 2026-02-16

### Added
- **Custom Field Allowed Values Discovery**:
  - `jira_get_custom_field_values` - New tool to retrieve allowed values for select/multi-select custom fields
  - `getCustomFieldAllowedValues()` - API method to get allowed values by field ID
  - `getCustomFieldAllowedValuesByName()` - API method to get allowed values by field name (case-insensitive)
  - Makes it easy to discover what values are valid for custom fields without checking Jira UI
  - Helps users fill in custom fields correctly with proper IDs and values

### Enhanced
- **Documentation**:
  - Added examples for discovering and using custom field allowed values
  - Updated Custom Fields Guide with new tool and API method documentation
  - Added troubleshooting tips for custom field value selection

### Fixed
- Better error messages when custom fields don't have predefined allowed values (free-text fields)

## [0.3.0] - 2026-02-16

### Added
- **Comprehensive Custom Fields Support** for all Jira operations:
  - `jira_get_custom_fields` - New tool to discover available custom fields for any project and issue type
  - All creation tools now support `customFields` parameter (Bugs, Stories, Tasks, Epics, Subtasks)
  - Custom field support in bulk update operations
  - API methods for fetching custom field metadata:
    - `getCreateMetadata()` - Get all field metadata for issue creation
    - `getEditMetadata()` - Get editable fields for existing issues
    - `getCustomFields()` - Extract only custom fields from metadata
    - `getAllFields()` - List all fields in Jira instance
    - `updateIssue()` - Update issues including custom field values
  - Dynamic webview forms automatically include custom fields
  - Support for all custom field types: text, select, multi-select, number, date, user picker
  - Validation for required custom fields and allowed values
  - Caching of custom field metadata for performance

### Enhanced
- **Data Models** with new interfaces:
  - `JiraCustomField` - Represents custom field definitions
  - `JiraCustomFieldsMetadata` - Container for custom fields metadata
  - `JiraEditMetadata` - Edit metadata for existing issues
  - `CreateIssueRequest` - Updated to support custom fields
- **Documentation**:
  - Added comprehensive Custom Fields Guide (docs/CUSTOM_FIELDS_GUIDE.md)
  - Usage examples for all custom field types
  - API reference with detailed examples
  - Best practices and troubleshooting guide

### Technical
- Enhanced JiraClient with 5 new methods for custom field operations
- Updated all 5 creation tools to accept custom fields
- Improved webview provider with better field type handling
- Better error messages for custom field validation failures

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
