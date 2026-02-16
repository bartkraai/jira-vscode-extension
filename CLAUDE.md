# AGENTS.md

> This document provides context and guidelines for AI agents (like GitHub Copilot, Claude, etc.) working on this VS Code extension codebase.

## Project Overview

This is **42-Jira-Buddy**, a VS Code extension that provides seamless integration between Visual Studio Code and Atlassian Jira. The extension enables developers to view, create, and manage Jira tickets directly from their editor, with special integration for GitHub Copilot.

### Primary Goals

1. **Quick Ticket Creation** - Create Jira bugs, stories, and tasks in under 30 seconds
2. **My Work View** - Display assigned tickets grouped by status in VS Code sidebar
3. **Copilot Integration** - Provide ticket context to GitHub Copilot for investigation
4. **Copilot Tools** - Allow Copilot to interact with Jira (add comments, update status, etc.)

## Key Technical Decisions

### Jira REST API Version

**We use Jira REST API v3** (latest version)

- Base URL: `https://{instance}.atlassian.net/rest/api/3`
- V3 is the current recommended version
- V3 provides better support for Atlassian Document Format (ADF)
- V2 and V3 have feature parity, but v3 is future-proof
- All API client code targets v3 endpoints

Example:
```typescript
// Correct
const baseUrl = `${instanceUrl}/rest/api/3`;

// Note: v2 is still supported but v3 is recommended
const oldBaseUrl = `${instanceUrl}/rest/api/2`; // Legacy
```

### Authentication & Security

**Use VS Code Secret Storage for API Tokens**

- **NEVER** store credentials in `settings.json` or workspace configuration
- **ALWAYS** use `context.secrets` API for sensitive data
- Store three secrets:
  - `jira.instanceUrl` - The Jira instance URL
  - `jira.email` - User's email address
  - `jira.apiToken` - Jira API token

Example:
```typescript
// Correct
await context.secrets.store('jira.apiToken', token);
const token = await context.secrets.get('jira.apiToken');

// Incorrect
await config.update('apiToken', token); // NEVER do this
```

API tokens are obtained from: `https://id.atlassian.com/manage-profile/security/api-tokens`

Authentication uses Basic Auth with base64 encoding:
```typescript
const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
```

## Project Structure

```
/src
  /api          # Jira API client and authentication
    JiraClient.ts       # Main API client class
    AuthManager.ts      # Credential management with secrets
  /commands     # Command handlers (create ticket, refresh, etc.)
  /providers    # VS Code providers
    JiraTreeProvider.ts         # Tree view for "My Work"
    CreateIssueWebviewProvider.ts  # Webview for ticket creation
  /models       # TypeScript interfaces/types
    jira.ts     # Jira entity types (Issue, Project, etc.)
  /utils        # Helper functions
  /config       # Configuration management
    ConfigManager.ts    # Wrapper for workspace config
  /test         # Test files
/resources      # Icons, images
/out            # Compiled JavaScript (gitignored)
```

## Important Guidelines

### When Working with Jira API

1. **Always use v2 endpoints**: `/rest/api/2/*`
2. **Handle Atlassian Document Format (ADF)**: Jira uses ADF for rich text fields (description, comments)
   ```typescript
   const adfContent = {
     type: 'doc',
     version: 1,
     content: [
       {
         type: 'paragraph',
         content: [{ type: 'text', text: 'Your text here' }]
       }
     ]
   };
   ```
3. **Use JQL for searches**: `assignee = currentUser() ORDER BY updated DESC`
4. **Respect rate limits**: Implement caching and exponential backoff
5. **Handle pagination**: Use `maxResults` and `startAt` parameters

### When Working with Authentication

1. **Never log credentials**: Redact tokens in logs and error messages
2. **Use secret storage**: Always use `context.secrets` API
3. **Test credentials**: Validate with a test API call before storing
4. **Handle expired tokens**: Prompt re-authentication on 401 errors
5. **Clear credentials**: Provide command to delete stored secrets

### When Working with VS Code Extension APIs

1. **Register all commands**: Define in `package.json` and register in `extension.ts`
2. **Dispose properly**: Add all disposables to `context.subscriptions`
3. **Use progress indicators**: Show progress for async operations
4. **Handle errors gracefully**: Use `vscode.window.showErrorMessage()`
5. **Respect theming**: Use VS Code CSS variables in webviews

### When Working with Tree Views

1. **Implement TreeDataProvider**: Must have `getTreeItem()` and `getChildren()`
2. **Fire change events**: Use `EventEmitter` to trigger refreshes
3. **Set context values**: Enable conditional menu items with `contextValue`
4. **Handle empty states**: Show helpful messages when no data
5. **Add loading states**: Display "Loading..." during async operations

### When Working with Webviews

1. **Enable scripts**: Set `enableScripts: true` in options
2. **Use message passing**: Communication via `postMessage`/`onDidReceiveMessage`
3. **Retain context**: Use `retainContextWhenHidden: true` for forms
4. **Dispose properly**: Clean up on `onDidDispose` event
5. **Theme aware**: Use `var(--vscode-*)` CSS variables

## Data Flow Examples

### Fetching Assigned Issues
```
User clicks refresh
  → Command: jira.refresh
  → JiraTreeProvider.refresh()
  → JiraClient.getAssignedIssues()
  → API: GET /rest/api/2/search?jql=assignee=currentUser()
  → Cache results (5 min TTL)
  → Fire _onDidChangeTreeData event
  → Tree view updates
```

### Creating a Bug
```
User clicks "Create Bug"
  → Command: jira.createBug
  → CreateIssueWebviewProvider.show('Bug')
  → Display form in webview panel
  → User fills form and clicks submit
  → Webview sends message to extension
  → JiraClient.createIssue(data)
  → API: POST /rest/api/2/issue
  → Show success notification
  → Refresh tree view
  → Close webview
```

### Investigate with Copilot
```
User right-clicks issue → "Investigate with Copilot"
  → Command: jira.investigateWithCopilot
  → JiraClient.getIssueDetails(issueKey)
  → Fetch comments, attachments, related issues
  → Generate markdown file with all context
  → Save to .jira/{issueKey}.md
  → Open file in editor (adds to Copilot context)
  → Show notification with action buttons
```

## Error Handling Strategy

### HTTP Status Codes

- **401 Unauthorized**: Prompt re-authentication, clear invalid credentials
- **403 Forbidden**: Show permission error, suggest admin contact
- **404 Not Found**: Specific error (e.g., "Issue PROJ-123 not found")
- **429 Rate Limited**: Implement exponential backoff, retry automatically
- **500/502/503**: Server error, retry with backoff (max 3 attempts)

### User-Facing Errors

Always provide:
1. **What happened**: Clear description of the error
2. **Why it happened**: If known (e.g., "Invalid credentials")
3. **What to do**: Actionable next steps (e.g., "Run 'Jira: Configure'")

Example:
```typescript
vscode.window.showErrorMessage(
  'Failed to create issue: Missing required field "summary". Please provide a summary.',
  'Try Again'
);
```

## Configuration Schema

### Settings (in package.json)

- `jiraExtension.instanceUrl`: Jira instance URL (public, in settings.json)
- `jiraExtension.projectKey`: Default project key
- `jiraExtension.featureEpics`: Array of feature epic IDs
- `jiraExtension.autoRefreshInterval`: Seconds between auto-refreshes
- `jiraExtension.contextFileLocation`: Directory for Copilot context files (default: `.jira`)
- `jiraExtension.enableCopilotTools`: Enable/disable Copilot tools
- `jiraExtension.maxIssues`: Max issues to fetch (default: 100)

### Secrets (in secret storage)

- `jira.instanceUrl`: Jira instance URL (duplicated for security)
- `jira.email`: User's email
- `jira.apiToken`: Jira API token (**never in settings!**)

## Testing Guidelines

### Unit Tests

- Mock HTTP client (axios) for all API tests
- Use test fixtures for Jira API responses
- Test error paths and edge cases
- Aim for >80% code coverage on core modules

### Integration Tests

- Use VS Code test runner (`@vscode/test-electron`)
- Test command execution end-to-end
- Test tree view provider behavior
- Test webview message passing

### Manual Testing Checklist

- [ ] Extension activates without errors
- [ ] Authentication flow works
- [ ] Tree view displays issues
- [ ] Refresh updates issues
- [ ] Filters work correctly
- [ ] Ticket creation succeeds
- [ ] Webview forms validate properly
- [ ] Context files generate correctly
- [ ] Commands appear in palette
- [ ] Keyboard shortcuts work

## Common Pitfalls to Avoid

1. **Don't use v3 API**: Stick to v2 for stability
2. **Don't store secrets in settings**: Use `context.secrets` only
3. **Don't forget to dispose**: Memory leaks from undisposed resources
4. **Don't block the UI**: Use async/await and progress indicators
5. **Don't ignore errors**: Always handle and report errors gracefully
6. **Don't hardcode URLs**: Use configuration for Jira instance URL
7. **Don't trust user input**: Validate all form inputs
8. **Don't cache indefinitely**: Set appropriate TTLs on cached data
9. **Don't forget pagination**: Handle large result sets properly
10. **Don't skip authentication checks**: Validate credentials before API calls

## Copilot Tools Integration

### Language Model Tools API

When implementing Copilot tools (Epic 8):

1. **Research first**: API is relatively new, check latest docs
2. **Clear descriptions**: Tool descriptions guide Copilot's usage
3. **Validate parameters**: Check required fields before execution
4. **Confirm destructive actions**: Status changes, time logging need confirmation
5. **Return structured results**: Consistent success/error response format

Example tool definition:
```typescript
{
  name: 'jira_add_comment',
  description: 'Add a comment to a Jira issue. Use this when documenting progress or responding to discussion.',
  parameters: {
    issueKey: { type: 'string', description: 'The Jira issue key (e.g., PROJ-123)', required: true },
    comment: { type: 'string', description: 'The comment text to add', required: true }
  }
}
```

## Performance Considerations

1. **Cache aggressively**: Projects and issue types rarely change (1 hour TTL)
2. **Lazy load**: Only fetch data when tree nodes expand
3. **Debounce searches**: Wait for user to stop typing
4. **Paginate results**: Don't fetch 1000s of issues at once
5. **Bundle properly**: Use webpack for production builds

## Security Checklist

- [ ] Credentials stored in secret storage only
- [ ] API tokens never logged or exposed
- [ ] HTTPS enforced for all API calls
- [ ] Input validation on all user inputs
- [ ] XSS protection in webviews (Content Security Policy)
- [ ] No eval() or Function() in webview scripts
- [ ] Dependencies regularly updated for security patches

## Debugging Tips

### Enable Extension Host Logging

Launch with:
```json
{
  "name": "Extension",
  "type": "extensionHost",
  "request": "launch",
  "runtimeExecutable": "${execPath}",
  "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
  "outFiles": ["${workspaceFolder}/out/**/*.js"]
}
```

### Add Debug Logging

```typescript
const outputChannel = vscode.window.createOutputChannel('42-Jira-Buddy');
outputChannel.appendLine(`[DEBUG] Fetching issues for ${email}`);
```

### Test API Calls with curl

```bash
curl -X GET \
  -H "Authorization: Basic $(echo -n 'email@example.com:api_token' | base64)" \
  -H "Content-Type: application/json" \
  https://your-instance.atlassian.net/rest/api/2/search?jql=assignee=currentUser()
```

## References

- [Jira REST API v2 Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v2/intro/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Secret Storage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)
- [Atlassian Document Format (ADF)](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/)
- [VS Code Language Model API](https://code.visualstudio.com/api/references/vscode-api#LanguageModelChat)

## Getting Help

- **Feature Specs**: See [FEATURES.md](./FEATURES.md) for detailed implementation specs
- **TODO Tracking**: See [TODO.md](./TODO.md) for feature checklist
- **VS Code API**: Use TypeScript IntelliSense and official docs
- **Jira API**: Refer to Atlassian's REST API v2 documentation

---

**Last Updated**: 2025-11-02
**Target VS Code Version**: 1.85.0+
**Target Jira API Version**: REST API v2
**Language**: TypeScript 5.0+
