# Custom Fields Guide

This document describes the custom field functionality in the 42-Jira-Buddy extension.

## Overview

The extension now provides comprehensive support for Jira custom fields, allowing users to:

1. **Discover custom fields** - Query available custom fields for any project and issue type
2. **Create issues with custom fields** - Include custom field values when creating issues through tools or webview
3. **Update custom fields** - Modify custom field values on existing issues
4. **Get custom field metadata** - Retrieve field definitions, allowed values, and requirements

## Architecture

### API Layer (JiraClient.ts)

The `JiraClient` class provides several methods for working with custom fields:

#### `getCreateMetadata(projectKey, issueTypeName, useCache?)`
Fetches create metadata including all available fields (system and custom) for a specific project and issue type.

**Parameters:**
- `projectKey` - The project key (e.g., 'PROJ')
- `issueTypeName` - The issue type name (e.g., 'Story', 'Bug', 'Task')
- `useCache` - Whether to use cached results (default: true)

**Returns:** `JiraCreateMetadata` with full field definitions

**Example:**
```typescript
const metadata = await jiraClient.getCreateMetadata('PROJ', 'Story');
const fields = metadata.projects[0].issuetypes[0].fields;
```

#### `getEditMetadata(issueKey, useCache?)`
Fetches edit metadata showing what fields can be edited on an existing issue.

**Parameters:**
- `issueKey` - The issue key (e.g., 'PROJ-123')
- `useCache` - Whether to use cached results (default: true)

**Returns:** `JiraEditMetadata` with editable field definitions

**Example:**
```typescript
const editMeta = await jiraClient.getEditMetadata('PROJ-123');
const editableFields = editMeta.fields;
```

#### `getCustomFields(projectKey, issueTypeName, useCache?)`
Extracts only custom fields from the create metadata for easier consumption.

**Parameters:**
- `projectKey` - The project key
- `issueTypeName` - The issue type name
- `useCache` - Whether to use cached results (default: true)

**Returns:** `JiraCustomFieldsMetadata` with array of custom field definitions

**Example:**
```typescript
const customFields = await jiraClient.getCustomFields('PROJ', 'Bug');
customFields.customFields.forEach(field => {
  console.log(`${field.name} (${field.fieldId}): ${field.required ? 'Required' : 'Optional'}`);
});
```

#### `getAllFields(useCache?)`
Gets all fields (system and custom) configured in the Jira instance.

**Parameters:**
- `useCache` - Whether to use cached results (default: true)

**Returns:** Array of field definitions with IDs, names, and schemas

**Example:**
```typescript
const allFields = await jiraClient.getAllFields();
const customFieldsOnly = allFields.filter(f => f.custom);
```

#### `updateIssue(issueKey, fields, notifyUsers?)`
Updates an issue with new field values, including custom fields.

**Parameters:**
- `issueKey` - The issue key to update
- `fields` - Object with field IDs as keys and values to set
- `notifyUsers` - Whether to notify users of the update (default: true)

**Example:**
```typescript
await jiraClient.updateIssue('PROJ-123', {
  summary: 'New summary',
  customfield_10001: 'Custom value',
  customfield_10002: { id: '10100' } // For select fields
});
```

### Data Models (jira.ts)

#### `JiraCustomField`
Represents a single custom field definition.

**Properties:**
- `fieldId` - Field ID (e.g., 'customfield_10001')
- `name` - Display name
- `schema` - Type information (type, custom, customId, items)
- `required` - Whether the field is required
- `allowedValues` - Array of allowed values for select/multi-select fields
- `defaultValue` - Default value if any
- `hasDefaultValue` - Whether a default value exists
- `operations` - Available operations
- `autoCompleteUrl` - URL for dynamic value lookup

#### `JiraCustomFieldsMetadata`
Container for custom fields metadata for a specific context.

**Properties:**
- `projectKey` - The project key
- `issueType` - The issue type name
- `customFields` - Array of `JiraCustomField` objects

#### `JiraCreateMetadata`
Full create metadata including all fields (system and custom).

**Properties:**
- `projects` - Array of project objects containing issue types and their fields

#### `JiraEditMetadata`
Edit metadata showing editable fields for an existing issue.

**Properties:**
- `fields` - Object with field IDs as keys and field configurations

#### `CreateIssueRequest`
Request object for creating issues, now supports custom fields.

**Properties:**
- `projectKey` - Required project key
- `summary` - Required issue summary
- `description` - Optional description
- `issueType` - Required issue type name
- `priority` - Optional priority
- `assignee` - Optional assignee account ID
- `reporter` - Optional reporter account ID
- `labels` - Optional array of labels
- `parentKey` - Optional parent issue key (for subtasks)
- `customFields` - Optional object with custom field values

### Tools

All creation tools now support custom fields:

#### `CreateBugTool`
Creates bugs with optional custom fields.

**Parameters:**
- `projectKey` - Required
- `summary` - Required
- `description` - Optional
- `priority` - Optional
- `customFields` - Optional object with custom field values

**Example:**
```typescript
{
  projectKey: 'PROJ',
  summary: 'Login page not loading',
  description: 'User reports login page shows blank screen',
  priority: 'High',
  customFields: {
    customfield_10001: 'Mobile',
    customfield_10002: { id: '10100' }
  }
}
```

#### `CreateStoryTool`
Creates stories with optional custom fields.

**Parameters:**
- `projectKey` - Required
- `summary` - Required
- `description` - Optional
- `parentKey` - Optional (epic link)
- `customFields` - Optional

#### `CreateTaskTool`
Creates tasks with optional custom fields.

**Parameters:**
- `projectKey` - Required
- `summary` - Required
- `description` - Optional
- `parentKey` - Optional
- `customFields` - Optional

#### `CreateEpicTool`
Creates epics with optional custom fields.

**Parameters:**
- `projectKey` - Required
- `summary` - Required
- `description` - Optional
- `customFields` - Optional

#### `CreateSubtaskTool`
Creates subtasks with optional custom fields.

**Parameters:**
- `parentKey` - Required
- `summary` - Required
- `description` - Optional
- `customFields` - Optional

#### `GetCustomFieldsTool` (New)
Retrieves custom field metadata for a project and issue type.

**Parameters:**
- `projectKey` - Required
- `issueType` - Required

**Returns:** Formatted list of custom fields with:
- Field name and ID
- Whether required
- Field type
- Allowed values (for select fields)
- Default values

**Example Usage by Copilot:**
```
User: "What custom fields are available for bugs in project ACME?"
Copilot uses: jira_get_custom_fields with projectKey='ACME', issueType='Bug'
Response shows all custom fields with their IDs and allowed values
```

#### `BulkUpdateTool`
Updates multiple issues at once, supports custom fields.

**Parameters:**
- `issueKeys` - Array of issue keys
- `fields` - Object with field IDs as keys (supports custom fields)

**Example:**
```typescript
{
  issueKeys: ['PROJ-123', 'PROJ-124', 'PROJ-125'],
  fields: {
    priority: { name: 'High' },
    customfield_10001: 'Production',
    customfield_10002: { id: '10200' }
  }
}
```

### Webview Provider (CreateIssueWebviewProvider.ts)

The create issue webview automatically supports custom fields through dynamic form generation:

1. **Fetches metadata** - Calls `getCreateMetadata()` for the selected project and issue type
2. **Generates form fields** - Creates appropriate input controls based on field types:
   - Text inputs for string fields
   - Textareas for long text fields
   - Select dropdowns for fields with allowed values
   - Multi-select for array fields
   - Date pickers for date fields
   - Number inputs for numeric fields
3. **Validates input** - Enforces required fields and data types
4. **Submits data** - Sends field values to the extension including custom fields

The webview handles custom fields transparently - no changes needed when custom fields are added or modified in Jira.

## Field Type Handling

### Text Fields
Custom fields with `schema.type = "string"`

**API Format:**
```typescript
customFields: {
  customfield_10001: "Text value"
}
```

### Select Fields (Single)
Custom fields with `schema.type = "string"` and `allowedValues`

**API Format:**
```typescript
customFields: {
  customfield_10002: { id: "10100" }
}
```

Or:
```typescript
customFields: {
  customfield_10002: { value: "Option Name" }
}
```

### Multi-Select Fields
Custom fields with `schema.type = "array"` and `allowedValues`

**API Format:**
```typescript
customFields: {
  customfield_10003: [
    { id: "10100" },
    { id: "10101" }
  ]
}
```

### Number Fields
Custom fields with `schema.type = "number"`

**API Format:**
```typescript
customFields: {
  customfield_10004: 42
}
```

### Date Fields
Custom fields with `schema.type = "date"`

**API Format:**
```typescript
customFields: {
  customfield_10005: "2025-12-31"
}
```

### User Picker Fields
Custom fields with `schema.type = "user"`

**API Format:**
```typescript
customFields: {
  customfield_10006: { accountId: "5b10ac8d82e05b22cc7d4ef5" }
}
```

Or:
```typescript
customFields: {
  customfield_10006: { id: "5b10ac8d82e05b22cc7d4ef5" }
}
```

## Usage Examples

### Example 1: Create a Bug with Custom Fields

**Using Copilot:**
```
User: "Create a bug for login failure, set environment to Production and severity to Critical"
Copilot:
1. First calls jira_get_custom_fields to find environment and severity field IDs
2. Then calls jira_create_bug with:
   - summary: "Login failure"
   - customFields: {
       customfield_10001: { value: "Production" },
       customfield_10002: { value: "Critical" }
     }
```

**Using API directly:**
```typescript
const bug = await jiraClient.createIssue({
  projectKey: 'PROJ',
  summary: 'Login failure on mobile app',
  description: 'Users cannot log in on iOS devices',
  issueType: 'Bug',
  priority: 'High',
  customFields: {
    customfield_10001: { value: 'Production' }, // Environment
    customfield_10002: { value: 'Critical' },   // Severity
    customfield_10003: 'Mobile App'             // Component
  }
});
```

### Example 2: Discover Custom Fields

**Using Copilot:**
```
User: "What custom fields do we have for stories in project ACME?"
Copilot calls: jira_get_custom_fields(projectKey='ACME', issueType='Story')
Response:
  - Story Points (customfield_10016) - REQUIRED
    Type: number
    
  - Sprint (customfield_10020)
    Type: Sprint (custom)
    
  - Epic Link (customfield_10014)
    Type: Epic Link (custom)
```

**Using API directly:**
```typescript
const customFields = await jiraClient.getCustomFields('ACME', 'Story');
console.log(`Found ${customFields.customFields.length} custom fields:`);
customFields.customFields.forEach(field => {
  console.log(`- ${field.name} (${field.fieldId})`);
  console.log(`  Required: ${field.required}`);
  console.log(`  Type: ${field.schema.type}`);
  if (field.allowedValues) {
    console.log(`  Values: ${field.allowedValues.map(v => v.value).join(', ')}`);
  }
});
```

### Example 3: Update Custom Fields on Existing Issue

**Using Copilot:**
```
User: "Update PROJ-123 to set story points to 5 and mark it as ready for dev"
Copilot:
1. Gets edit metadata to find field IDs
2. Updates issue with custom field values
```

**Using API directly:**
```typescript
await jiraClient.updateIssue('PROJ-123', {
  customfield_10016: 5,                        // Story Points
  customfield_10030: { value: 'Ready for Dev' } // Status field
});
```

### Example 4: Bulk Update Custom Fields

**Using Copilot:**
```
User: "Set all issues PROJ-123, PROJ-124, PROJ-125 to Production environment"
Copilot calls: jira_bulk_update with customFields
```

**Using API directly:**
```typescript
await jiraClient.bulkUpdateIssues(
  ['PROJ-123', 'PROJ-124', 'PROJ-125'],
  {
    customfield_10001: { value: 'Production' }
  }
);
```

## Best Practices

### 1. Always Discover Fields First
Before creating or updating issues with custom fields, use `getCustomFields()` or `getCreateMetadata()` to discover available fields and their requirements.

### 2. Use Correct Value Format
Different field types require different value formats. Consult the field's schema to determine the correct format.

### 3. Handle Required Fields
Check the `required` property on custom fields and ensure required fields are always provided.

### 4. Validate Allowed Values
For select fields, ensure the provided value is in the `allowedValues` array.

### 5. Cache Metadata
Custom field metadata rarely changes. Use the caching mechanism (enabled by default) to reduce API calls.

### 6. Handle Errors Gracefully
Field validation errors will be returned as 400 errors with details about which fields failed validation.

## Common Custom Field Types in Jira

### Jira Software Fields
- `Sprint` - customfield_10016 (typical)
- `Story Points` - customfield_10016 or similar
- `Epic Link` - customfield_10014 or similar
- `Epic Name` - customfield_10011 or similar

### Common Custom Types
- `com.atlassian.jira.plugin.system.customfieldtypes:select` - Single select dropdown
- `com.atlassian.jira.plugin.system.customfieldtypes:multiselect` - Multi-select
- `com.atlassian.jira.plugin.system.customfieldtypes:textfield` - Short text
- `com.atlassian.jira.plugin.system.customfieldtypes:textarea` - Long text
- `com.atlassian.jira.plugin.system.customfieldtypes:datepicker` - Date
- `com.atlassian.jira.plugin.system.customfieldtypes:userpicker` - User selector
- `com.atlassian.jira.plugin.system.customfieldtypes:float` - Decimal number

## Troubleshooting

### Issue: Custom field not appearing in metadata
**Solution:** Check if the field is configured for the specific project and issue type combination.

### Issue: "Field validation failed" error
**Solution:** Ensure you're using the correct value format for the field type. Check `allowedValues` for select fields.

### Issue: Custom field value not saving
**Solution:** Verify the field ID is correct and the field is editable for the issue's current status/workflow state.

### Issue: Can't find custom field ID
**Solution:** Use `getAllFields()` or `getCustomFields()` to discover field IDs, or check the field configuration in Jira.

## API Reference

See the following files for implementation details:
- `src/api/JiraClient.ts` - API client methods
- `src/models/jira.ts` - Type definitions
- `src/tools/GetCustomFieldsTool.ts` - Custom field discovery tool
- `src/providers/CreateIssueWebviewProvider.ts` - Webview with dynamic forms

## Related Documentation

- [Jira REST API - Get Create Metadata](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-createmeta-get)
- [Jira REST API - Get Edit Metadata](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-editmeta-get)
- [Jira REST API - Get Fields](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-rest-api-3-field-get)
- [Jira Custom Field Types](https://support.atlassian.com/jira-cloud-administration/docs/custom-field-types/)
