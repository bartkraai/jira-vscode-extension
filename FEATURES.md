# Jira VS Code Extension - Feature Breakdown

This document provides detailed feature specifications for each epic, breaking them into individual, implementable features.

---

## Epic 1: Extension Foundation & Setup

### Feature 1.1: Project Scaffolding
**Priority:** P0
**Effort:** 4 hours

**Description:**
Initialize the VS Code extension project with proper structure and tooling.

**Implementation Details:**
- Use `yo code` generator or manual setup with TypeScript template
- Project structure:
  ```
  /src
    /api          # Jira API client
    /commands     # Command handlers
    /providers    # Tree view, webview providers
    /models       # TypeScript interfaces/types
    /utils        # Helper functions
    /test         # Test files
  /resources      # Icons, images
  /out            # Compiled JavaScript (gitignored)
  ```
- Dependencies to install:
  - `vscode` (types)
  - `axios` or `node-fetch` (HTTP client)
  - `typescript`
  - Dev dependencies: `@types/node`, `@types/vscode`, `eslint`, `prettier`

**Acceptance Criteria:**
- ✅ Project structure created with all directories
- ✅ package.json configured with correct dependencies
- ✅ TypeScript compiles without errors
- ✅ Extension can be run in debug mode (F5)

**Technical Notes:**
- Use ES2020 or later for modern JavaScript features
- Configure strict TypeScript mode for type safety

---

### Feature 1.2: Build System Configuration
**Priority:** P0
**Effort:** 3 hours

**Description:**
Set up TypeScript compilation, webpack bundling, and watch mode for development.

**Implementation Details:**
- Configure `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "module": "commonjs",
      "target": "ES2020",
      "outDir": "out",
      "lib": ["ES2020"],
      "sourceMap": true,
      "rootDir": "src",
      "strict": true,
      "esModuleInterop": true
    }
  }
  ```
- Add webpack for bundling:
  - Configure webpack.config.js
  - Bundle for production (minified)
  - Separate dev/prod configurations
- Add build scripts to package.json:
  - `npm run compile` - TypeScript compilation
  - `npm run watch` - Watch mode for development
  - `npm run package` - Production bundle

**Acceptance Criteria:**
- ✅ TypeScript compiles to out directory
- ✅ Watch mode recompiles on file changes
- ✅ Production build creates minified bundle
- ✅ Source maps generated for debugging

---

### Feature 1.3: Extension Activation
**Priority:** P0
**Effort:** 2 hours

**Description:**
Implement extension activation logic and lifecycle management.

**Implementation Details:**
- Create `src/extension.ts` with activate/deactivate functions:
  ```typescript
  export function activate(context: vscode.ExtensionContext) {
    console.log('Jira Extension is now active');
    // Register commands, views, providers
  }

  export function deactivate() {
    // Cleanup resources
  }
  ```
- Configure activation events in package.json:
  ```json
  "activationEvents": [
    "onStartupFinished",
    "onCommand:jira.configure"
  ]
  ```
- Store extension context globally for access across modules

**Acceptance Criteria:**
- ✅ Extension activates when VS Code starts
- ✅ Activation is logged to output channel
- ✅ Deactivation cleans up resources properly
- ✅ Extension context accessible to all modules

---

### Feature 1.4: Development Tools Setup
**Priority:** P0
**Effort:** 2 hours

**Description:**
Configure ESLint, Prettier, and code quality tools.

**Implementation Details:**
- ESLint configuration (.eslintrc.json):
  - Use @typescript-eslint parser
  - Recommended rules for TypeScript
  - VS Code extension specific rules
- Prettier configuration (.prettierrc):
  - Consistent formatting rules
  - Integration with ESLint
- VS Code settings (.vscode/settings.json):
  - Format on save
  - ESLint auto-fix on save
- Pre-commit hooks (optional with husky):
  - Lint staged files
  - Run tests

**Acceptance Criteria:**
- ✅ ESLint catches common errors
- ✅ Prettier formats code consistently
- ✅ Format on save works in VS Code
- ✅ No linting errors in codebase

---

### Feature 1.5: Test Infrastructure
**Priority:** P0
**Effort:** 3 hours

**Description:**
Set up VS Code extension test runner and basic test structure.

**Implementation Details:**
- Install test dependencies:
  - `@vscode/test-electron`
  - `mocha` or `jest`
  - `@types/mocha` or `@types/jest`
- Create test runner configuration
- Create sample test file structure:
  ```
  /src/test
    /suite
      extension.test.ts
      api.test.ts
    runTest.ts
    index.ts
  ```
- Add test script to package.json:
  - `npm test` - Run all tests

**Acceptance Criteria:**
- ✅ Test runner executes successfully
- ✅ Sample test passes
- ✅ Test coverage reporting configured
- ✅ Tests run in CI/CD pipeline (future)

---

## Epic 2: Jira API Integration & Authentication

### Feature 2.1: API Client Architecture
**Priority:** P0
**Effort:** 4 hours

**Description:**
Create the base Jira API client class with proper TypeScript types.

**Implementation Details:**
- Create `src/api/JiraClient.ts`:
  ```typescript
  export class JiraClient {
    private baseUrl: string;
    private authToken: string;
    private httpClient: AxiosInstance;

    constructor(baseUrl: string, authToken: string) {
      this.baseUrl = baseUrl;
      this.authToken = authToken;
      this.httpClient = axios.create({
        baseURL: `${baseUrl}/rest/api/3`,
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `email:${authToken}`
          ).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });
    }

    async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
      // Implement request logic with error handling
    }
  }
  ```
- Create TypeScript interfaces in `src/models/jira.ts`:
  - `JiraIssue`
  - `JiraProject`
  - `JiraIssueType`
  - `JiraComment`
  - `JiraTransition`
  - `JiraUser`

**Acceptance Criteria:**
- ✅ JiraClient class instantiates correctly
- ✅ HTTP client configured with proper headers
- ✅ TypeScript types defined for all Jira entities
- ✅ Request method handles GET/POST/PUT/DELETE

---

### Feature 2.2: Authentication Flow
**Priority:** P0
**Effort:** 5 hours

**Description:**
Implement secure authentication with Jira using API tokens stored in VS Code secret storage.

**Implementation Details:**
- Create `src/api/AuthManager.ts`:
  ```typescript
  export class AuthManager {
    constructor(private context: vscode.ExtensionContext) {}

    async getCredentials(): Promise<JiraCredentials | null> {
      const url = await this.context.secrets.get('jira.instanceUrl');
      const email = await this.context.secrets.get('jira.email');
      const token = await this.context.secrets.get('jira.apiToken');
      if (!url || !email || !token) return null;
      return { url, email, token };
    }

    async setCredentials(credentials: JiraCredentials): Promise<void> {
      await this.context.secrets.store('jira.instanceUrl', credentials.url);
      await this.context.secrets.store('jira.email', credentials.email);
      await this.context.secrets.store('jira.apiToken', credentials.token);
    }

    async clearCredentials(): Promise<void> {
      await this.context.secrets.delete('jira.instanceUrl');
      await this.context.secrets.delete('jira.email');
      await this.context.secrets.delete('jira.apiToken');
    }
  }
  ```
- Create command: `jira.authenticate`
- Prompt user for:
  1. Jira instance URL (e.g., https://company.atlassian.net)
  2. Email address
  3. API token (from https://id.atlassian.com/manage-profile/security/api-tokens)
- Validate credentials by making test API call
- Store in secret storage (never in settings.json)

**Acceptance Criteria:**
- ✅ User can input Jira credentials via prompts
- ✅ Credentials stored securely in secret storage
- ✅ Credentials validated before storing
- ✅ Invalid credentials show error message
- ✅ User can re-authenticate to update credentials
- ✅ Clear credentials command available

---

### Feature 2.3: Fetch Assigned Issues
**Priority:** P0
**Effort:** 4 hours

**Description:**
Implement API method to fetch all issues assigned to the current user.

**Implementation Details:**
- Add method to JiraClient:
  ```typescript
  async getAssignedIssues(options?: {
    maxResults?: number;
    startAt?: number;
    fields?: string[];
  }): Promise<JiraIssue[]> {
    const jql = 'assignee = currentUser() ORDER BY updated DESC';
    const response = await this.request<JiraSearchResponse>('GET', '/search', {
      params: {
        jql,
        maxResults: options?.maxResults || 100,
        startAt: options?.startAt || 0,
        fields: options?.fields || [
          'summary', 'status', 'priority', 'issuetype',
          'updated', 'created', 'assignee', 'reporter',
          'description', 'parent', 'sprint'
        ]
      }
    });
    return response.issues;
  }
  ```
- Handle pagination for large result sets
- Parse and normalize response data

**Acceptance Criteria:**
- ✅ Method returns array of JiraIssue objects
- ✅ Issues include all required fields
- ✅ Pagination works for >100 issues
- ✅ Handles empty result sets
- ✅ Errors handled gracefully

---

### Feature 2.4: Fetch Issue Details
**Priority:** P0
**Effort:** 3 hours

**Description:**
Implement API method to fetch full details of a specific issue.

**Implementation Details:**
- Add method to JiraClient:
  ```typescript
  async getIssueDetails(issueKey: string): Promise<JiraIssueDetails> {
    const response = await this.request<JiraIssueDetails>(
      'GET',
      `/issue/${issueKey}`,
      {
        params: {
          fields: '*all',
          expand: 'renderedFields,names,schema,transitions,changelog,comments'
        }
      }
    );
    return response;
  }
  ```
- Fetch additional data:
  - Comments
  - Attachments
  - Related issues
  - Change history
  - Available transitions

**Acceptance Criteria:**
- ✅ Method returns detailed JiraIssueDetails object
- ✅ Includes comments and attachments
- ✅ Includes linked issues
- ✅ 404 error handled for invalid issue keys
- ✅ Response properly typed

---

### Feature 2.5: Create Issue
**Priority:** P0
**Effort:** 5 hours

**Description:**
Implement API method to create new Jira issues.

**Implementation Details:**
- Add method to JiraClient:
  ```typescript
  async createIssue(issueData: CreateIssueRequest): Promise<JiraIssue> {
    const payload = {
      fields: {
        project: { key: issueData.projectKey },
        summary: issueData.summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: issueData.description }]
            }
          ]
        },
        issuetype: { name: issueData.issueType },
        ...issueData.customFields
      }
    };

    const response = await this.request<{ key: string; id: string }>(
      'POST',
      '/issue',
      { data: payload }
    );

    return await this.getIssueDetails(response.key);
  }
  ```
- Handle Jira's Document Format (ADF) for rich text descriptions
- Support custom fields based on project configuration
- Validate required fields before submission

**Acceptance Criteria:**
- ✅ Successfully creates issues in Jira
- ✅ Returns created issue with key and ID
- ✅ Handles ADF description format
- ✅ Validates required fields
- ✅ Custom fields supported
- ✅ Error messages show field validation failures

---

### Feature 2.6: Update Issue Status
**Priority:** P0
**Effort:** 4 hours

**Description:**
Implement API method to transition issues between statuses.

**Implementation Details:**
- Add methods to JiraClient:
  ```typescript
  async getAvailableTransitions(issueKey: string): Promise<JiraTransition[]> {
    const response = await this.request<{ transitions: JiraTransition[] }>(
      'GET',
      `/issue/${issueKey}/transitions`
    );
    return response.transitions;
  }

  async transitionIssue(
    issueKey: string,
    transitionId: string,
    comment?: string
  ): Promise<void> {
    const payload: any = {
      transition: { id: transitionId }
    };

    if (comment) {
      payload.update = {
        comment: [{
          add: {
            body: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: comment }]
                }
              ]
            }
          }
        }]
      };
    }

    await this.request('POST', `/issue/${issueKey}/transitions`, {
      data: payload
    });
  }
  ```
- Map status names to transition IDs
- Support optional comment during transition

**Acceptance Criteria:**
- ✅ Can fetch available transitions for an issue
- ✅ Successfully transitions issues
- ✅ Optional comment added during transition
- ✅ Invalid transitions show error
- ✅ UI shows only valid status changes

---

### Feature 2.7: Add Comment
**Priority:** P0
**Effort:** 3 hours

**Description:**
Implement API method to add comments to issues.

**Implementation Details:**
- Add method to JiraClient:
  ```typescript
  async addComment(issueKey: string, commentText: string): Promise<JiraComment> {
    const payload = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: commentText }]
          }
        ]
      }
    };

    const response = await this.request<JiraComment>(
      'POST',
      `/issue/${issueKey}/comment`,
      { data: payload }
    );
    return response;
  }
  ```
- Support ADF format for rich text
- Return created comment with ID

**Acceptance Criteria:**
- ✅ Successfully adds comments to issues
- ✅ Returns comment object with ID
- ✅ Handles ADF format correctly
- ✅ Error handling for invalid issue keys

---

### Feature 2.8: Fetch Projects and Issue Types
**Priority:** P0
**Effort:** 3 hours

**Description:**
Implement API methods to fetch available projects and issue types for form dropdowns.

**Implementation Details:**
- Add methods to JiraClient:
  ```typescript
  async getProjects(): Promise<JiraProject[]> {
    const response = await this.request<JiraProject[]>('GET', '/project');
    return response;
  }

  async getIssueTypes(projectKey: string): Promise<JiraIssueType[]> {
    const response = await this.request<{ issueTypes: JiraIssueType[] }>(
      'GET',
      `/project/${projectKey}`
    );
    return response.issueTypes;
  }

  async getCreateMetadata(projectKey: string, issueType: string) {
    const response = await this.request('GET', '/issue/createmeta', {
      params: {
        projectKeys: projectKey,
        issuetypeNames: issueType,
        expand: 'projects.issuetypes.fields'
      }
    });
    return response;
  }
  ```
- Cache project/issue type data (rarely changes)
- Fetch create metadata for dynamic form building

**Acceptance Criteria:**
- ✅ Returns list of accessible projects
- ✅ Returns issue types for specified project
- ✅ Create metadata includes required/optional fields
- ✅ Results cached to reduce API calls

---

### Feature 2.9: Error Handling
**Priority:** P0
**Effort:** 4 hours

**Description:**
Implement comprehensive error handling for all API operations.

**Implementation Details:**
- Create error types:
  ```typescript
  export class JiraAPIError extends Error {
    constructor(
      message: string,
      public statusCode: number,
      public response?: any
    ) {
      super(message);
      this.name = 'JiraAPIError';
    }
  }

  export class JiraAuthenticationError extends JiraAPIError {
    constructor(message: string = 'Authentication failed') {
      super(message, 401);
      this.name = 'JiraAuthenticationError';
    }
  }

  export class JiraPermissionError extends JiraAPIError {
    constructor(message: string = 'Permission denied') {
      super(message, 403);
      this.name = 'JiraPermissionError';
    }
  }
  ```
- Handle HTTP status codes:
  - 401: Invalid credentials → prompt re-authentication
  - 403: Permission denied → show helpful message
  - 404: Resource not found
  - 429: Rate limited → implement backoff
  - 500/502/503: Server error → retry with backoff
- Implement retry logic with exponential backoff:
  ```typescript
  async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (this.isRetryable(error)) {
          await this.delay(Math.pow(2, i) * 1000);
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }
  ```

**Acceptance Criteria:**
- ✅ All HTTP status codes handled appropriately
- ✅ Authentication errors trigger re-auth flow
- ✅ Transient errors retried automatically
- ✅ Non-retryable errors fail fast
- ✅ Error messages are user-friendly

---

### Feature 2.10: Response Caching
**Priority:** P0
**Effort:** 3 hours

**Description:**
Implement caching layer for API responses to reduce load and improve performance.

**Implementation Details:**
- Create cache manager:
  ```typescript
  export class CacheManager {
    private cache: Map<string, CacheEntry> = new Map();

    set(key: string, value: any, ttl: number = 300000) {
      this.cache.set(key, {
        value,
        expiry: Date.now() + ttl
      });
    }

    get<T>(key: string): T | null {
      const entry = this.cache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiry) {
        this.cache.delete(key);
        return null;
      }
      return entry.value as T;
    }

    invalidate(pattern: string) {
      // Invalidate cache entries matching pattern
    }
  }
  ```
- Cache strategy:
  - Projects: 1 hour TTL
  - Issue types: 1 hour TTL
  - Issue details: 5 minutes TTL
  - Assigned issues list: 2 minutes TTL
- Implement cache invalidation on mutations
- Add cache clear command

**Acceptance Criteria:**
- ✅ Frequently accessed data cached
- ✅ Cache respects TTL
- ✅ Cache invalidated after mutations
- ✅ Memory usage reasonable
- ✅ Cache can be manually cleared

---

### Feature 2.11: API Client Unit Tests
**Priority:** P0
**Effort:** 5 hours

**Description:**
Write comprehensive unit tests for the Jira API client.

**Implementation Details:**
- Mock HTTP client (axios) for testing
- Test cases:
  - Authentication flow
  - Each API method
  - Error handling
  - Retry logic
  - Cache behavior
- Use test fixtures for Jira API responses
- Test edge cases:
  - Empty results
  - Malformed responses
  - Network failures

**Acceptance Criteria:**
- ✅ >80% code coverage for API client
- ✅ All API methods tested
- ✅ Error paths tested
- ✅ Tests pass consistently
- ✅ Tests run fast (use mocks, no real API calls)

---

## Epic 3: Configuration Management

### Feature 3.1: Configuration Schema Definition
**Priority:** P0
**Effort:** 3 hours

**Description:**
Define all configuration options in package.json with proper types and defaults.

**Implementation Details:**
- Add to package.json:
  ```json
  "contributes": {
    "configuration": {
      "title": "Jira Extension",
      "properties": {
        "jiraExtension.instanceUrl": {
          "type": "string",
          "default": "",
          "description": "Your Jira instance URL (e.g., https://company.atlassian.net)"
        },
        "jiraExtension.projectKey": {
          "type": "string",
          "default": "",
          "description": "Default project key for ticket creation"
        },
        "jiraExtension.featureEpics": {
          "type": "array",
          "items": { "type": "string" },
          "default": [],
          "description": "List of feature epic IDs for bug creation"
        },
        "jiraExtension.autoRefreshInterval": {
          "type": "number",
          "default": 300,
          "description": "Auto-refresh interval in seconds (0 to disable)"
        },
        "jiraExtension.contextFileLocation": {
          "type": "string",
          "default": ".jira",
          "description": "Directory for Copilot context files"
        },
        "jiraExtension.enableCopilotTools": {
          "type": "boolean",
          "default": true,
          "description": "Enable Copilot tools integration"
        },
        "jiraExtension.maxIssues": {
          "type": "number",
          "default": 100,
          "description": "Maximum number of issues to fetch"
        }
      }
    }
  }
  ```

**Acceptance Criteria:**
- ✅ All config options defined in package.json
- ✅ Proper types and defaults set
- ✅ Descriptions are clear and helpful
- ✅ Config shows in VS Code settings UI

---

### Feature 3.2: Configuration Access Layer
**Priority:** P0
**Effort:** 3 hours

**Description:**
Create wrapper class for accessing and updating configuration.

**Implementation Details:**
- Create `src/config/ConfigManager.ts`:
  ```typescript
  export class ConfigManager {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
      this.config = vscode.workspace.getConfiguration('jiraExtension');
    }

    get instanceUrl(): string {
      return this.config.get('instanceUrl', '');
    }

    get projectKey(): string {
      return this.config.get('projectKey', '');
    }

    get featureEpics(): string[] {
      return this.config.get('featureEpics', []);
    }

    get autoRefreshInterval(): number {
      return this.config.get('autoRefreshInterval', 300);
    }

    get contextFileLocation(): string {
      return this.config.get('contextFileLocation', '.jira');
    }

    get enableCopilotTools(): boolean {
      return this.config.get('enableCopilotTools', true);
    }

    get maxIssues(): number {
      return this.config.get('maxIssues', 100);
    }

    async update(key: string, value: any, global: boolean = false): Promise<void> {
      await this.config.update(key, value, global);
    }

    async validate(): Promise<ConfigValidationResult> {
      // Validate configuration values
    }
  }
  ```
- Type-safe getters for all config options
- Update methods with validation

**Acceptance Criteria:**
- ✅ Config values accessible via type-safe methods
- ✅ Updates propagate to VS Code settings
- ✅ Defaults applied when values not set
- ✅ Works with both workspace and user settings

---

### Feature 3.3: Initial Setup Wizard
**Priority:** P0
**Effort:** 5 hours

**Description:**
Create command that guides users through initial configuration.

**Implementation Details:**
- Create command: `jira.configure`
- Multi-step input flow:
  ```typescript
  async function setupWizard() {
    // Step 1: Jira instance URL
    const instanceUrl = await vscode.window.showInputBox({
      prompt: 'Enter your Jira instance URL',
      placeHolder: 'https://company.atlassian.net',
      validateInput: (value) => {
        if (!value.startsWith('https://')) {
          return 'URL must start with https://';
        }
        return null;
      }
    });

    // Step 2: Email
    const email = await vscode.window.showInputBox({
      prompt: 'Enter your Jira email address',
      placeHolder: 'you@company.com',
      validateInput: (value) => {
        if (!value.includes('@')) {
          return 'Please enter a valid email';
        }
        return null;
      }
    });

    // Step 3: API Token
    const apiToken = await vscode.window.showInputBox({
      prompt: 'Enter your Jira API token',
      password: true,
      placeHolder: 'Generate at https://id.atlassian.com/manage-profile/security/api-tokens'
    });

    // Step 4: Test connection
    const client = new JiraClient(instanceUrl, email, apiToken);
    await client.testConnection();

    // Step 5: Select default project
    const projects = await client.getProjects();
    const projectItems = projects.map(p => ({
      label: p.name,
      description: p.key
    }));
    const selectedProject = await vscode.window.showQuickPick(projectItems, {
      placeHolder: 'Select default project'
    });

    // Save configuration
    await configManager.update('instanceUrl', instanceUrl);
    await configManager.update('projectKey', selectedProject.description);
    await authManager.setCredentials({ url: instanceUrl, email, token: apiToken });

    vscode.window.showInformationMessage('Jira extension configured successfully!');
  }
  ```

**Acceptance Criteria:**
- ✅ Wizard guides through all required config
- ✅ Input validation prevents invalid values
- ✅ Connection tested before saving
- ✅ User feedback at each step
- ✅ Can re-run wizard to reconfigure

---

### Feature 3.4: Configuration Validation
**Priority:** P0
**Effort:** 3 hours

**Description:**
Validate configuration values and show helpful errors for invalid settings.

**Implementation Details:**
- Create validator:
  ```typescript
  export interface ConfigValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
  }

  export class ConfigValidator {
    async validate(config: ConfigManager): Promise<ConfigValidationResult> {
      const result: ConfigValidationResult = {
        valid: true,
        errors: [],
        warnings: []
      };

      // Validate instance URL
      if (!config.instanceUrl) {
        result.valid = false;
        result.errors.push('Instance URL is required');
      } else if (!config.instanceUrl.startsWith('https://')) {
        result.valid = false;
        result.errors.push('Instance URL must start with https://');
      }

      // Validate project key
      if (!config.projectKey) {
        result.warnings.push('No default project set');
      }

      // Validate auto-refresh interval
      if (config.autoRefreshInterval < 0) {
        result.errors.push('Auto-refresh interval must be >= 0');
        result.valid = false;
      }

      // Test API connection
      try {
        const credentials = await authManager.getCredentials();
        if (!credentials) {
          result.valid = false;
          result.errors.push('No credentials configured. Run "Jira: Configure"');
        } else {
          const client = new JiraClient(credentials.url, credentials.email, credentials.token);
          await client.testConnection();
        }
      } catch (error) {
        result.valid = false;
        result.errors.push(`Connection test failed: ${error.message}`);
      }

      return result;
    }
  }
  ```
- Run validation:
  - On extension activation
  - When configuration changes
  - Before API operations
- Show errors in output channel and notifications

**Acceptance Criteria:**
- ✅ Invalid config shows clear error messages
- ✅ Validation runs automatically
- ✅ Users guided to fix configuration
- ✅ Warnings shown for non-critical issues

---

### Feature 3.5: Configuration Change Handlers
**Priority:** P0
**Effort:** 2 hours

**Description:**
React to configuration changes and update extension behavior accordingly.

**Implementation Details:**
- Register config change listener:
  ```typescript
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('jiraExtension')) {
      handleConfigChange(event);
    }
  });

  async function handleConfigChange(event: vscode.ConfigurationChangeEvent) {
    // Refresh API client if URL changed
    if (event.affectsConfiguration('jiraExtension.instanceUrl')) {
      await reinitializeApiClient();
    }

    // Update refresh interval
    if (event.affectsConfiguration('jiraExtension.autoRefreshInterval')) {
      treeViewProvider.updateRefreshInterval();
    }

    // Refresh tree view
    if (event.affectsConfiguration('jiraExtension.projectKey')) {
      treeViewProvider.refresh();
    }
  }
  ```

**Acceptance Criteria:**
- ✅ Config changes apply immediately
- ✅ API client reinitializes on URL change
- ✅ Tree view refreshes on relevant changes
- ✅ No errors on config changes

---

## Epic 4: My Work View - Tree View Implementation

### Feature 4.1: Tree Data Provider Implementation
**Priority:** P0
**Effort:** 6 hours

**Description:**
Implement TreeDataProvider for displaying Jira tickets in VS Code sidebar.

**Implementation Details:**
- Create `src/providers/JiraTreeProvider.ts`:
  ```typescript
  export class JiraTreeProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(
      private jiraClient: JiraClient,
      private configManager: ConfigManager
    ) {}

    refresh(): void {
      this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
      return element;
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
      if (!element) {
        // Root level - return status groups
        return this.getStatusGroups();
      } else if (element.type === 'statusGroup') {
        // Return issues for this status
        return this.getIssuesForStatus(element.status);
      }
      return [];
    }

    private async getStatusGroups(): Promise<StatusGroupItem[]> {
      const issues = await this.jiraClient.getAssignedIssues();
      const grouped = this.groupByStatus(issues);
      return Object.keys(grouped).map(status =>
        new StatusGroupItem(status, grouped[status].length)
      );
    }

    private async getIssuesForStatus(status: string): Promise<IssueItem[]> {
      const issues = await this.jiraClient.getAssignedIssues();
      return issues
        .filter(issue => issue.fields.status.name === status)
        .map(issue => new IssueItem(issue));
    }

    private groupByStatus(issues: JiraIssue[]): Record<string, JiraIssue[]> {
      return issues.reduce((acc, issue) => {
        const status = issue.fields.status.name;
        if (!acc[status]) acc[status] = [];
        acc[status].push(issue);
        return acc;
      }, {} as Record<string, JiraIssue[]>);
    }
  }
  ```

**Acceptance Criteria:**
- ✅ TreeDataProvider implements all required methods
- ✅ Tree structure: status groups → issues
- ✅ Issues grouped correctly by status
- ✅ Tree updates on refresh
- ✅ Handles empty states

---

### Feature 4.2: Tree Item Definitions
**Priority:** P0
**Effort:** 4 hours

**Description:**
Define tree item classes for status groups and issues with proper formatting.

**Implementation Details:**
- Create tree item classes:
  ```typescript
  export class StatusGroupItem extends vscode.TreeItem {
    constructor(
      public readonly status: string,
      public readonly count: number
    ) {
      super(
        `${status} (${count})`,
        vscode.TreeItemCollapsibleState.Expanded
      );
      this.contextValue = 'statusGroup';
      this.type = 'statusGroup';
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }

  export class IssueItem extends vscode.TreeItem {
    constructor(public readonly issue: JiraIssue) {
      super(
        `${issue.key}: ${issue.fields.summary}`,
        vscode.TreeItemCollapsibleState.None
      );

      this.contextValue = 'issue';
      this.type = 'issue';

      // Set icon based on issue type
      this.iconPath = this.getIssueTypeIcon(issue.fields.issuetype.name);

      // Set tooltip
      this.tooltip = this.buildTooltip();

      // Set description (right-side text)
      this.description = this.buildDescription();

      // Make clickable
      this.command = {
        command: 'jira.openIssue',
        title: 'Open Issue',
        arguments: [issue.key]
      };
    }

    private buildTooltip(): string {
      return `${this.issue.key}: ${this.issue.fields.summary}\n` +
             `Status: ${this.issue.fields.status.name}\n` +
             `Priority: ${this.issue.fields.priority.name}\n` +
             `Updated: ${new Date(this.issue.fields.updated).toLocaleDateString()}`;
    }

    private buildDescription(): string {
      const priority = this.getPriorityEmoji(this.issue.fields.priority.name);
      return `${priority} ${this.issue.fields.issuetype.name}`;
    }

    private getIssueTypeIcon(type: string): vscode.ThemeIcon {
      const iconMap: Record<string, string> = {
        'Bug': 'bug',
        'Story': 'book',
        'Task': 'checklist',
        'Epic': 'milestone',
        'Subtask': 'list-tree'
      };
      return new vscode.ThemeIcon(iconMap[type] || 'issue');
    }

    private getPriorityEmoji(priority: string): string {
      const emojiMap: Record<string, string> = {
        'Highest': '🔴',
        'High': '🟠',
        'Medium': '🟡',
        'Low': '🟢',
        'Lowest': '⚪'
      };
      return emojiMap[priority] || '⚪';
    }
  }
  ```

**Acceptance Criteria:**
- ✅ Status groups show status name and count
- ✅ Issue items show key and summary
- ✅ Icons match issue types
- ✅ Priority indicators visible
- ✅ Tooltips show detailed information
- ✅ Items are clickable

---

### Feature 4.3: Tree View Registration
**Priority:** P0
**Effort:** 2 hours

**Description:**
Register tree view in VS Code activity bar and configure view container.

**Implementation Details:**
- Add to package.json:
  ```json
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "jira",
          "title": "Jira",
          "icon": "resources/jira-icon.svg"
        }
      ]
    },
    "views": {
      "jira": [
        {
          "id": "jiraMyWork",
          "name": "My Work"
        }
      ]
    }
  }
  ```
- Register in extension.ts:
  ```typescript
  const treeProvider = new JiraTreeProvider(jiraClient, configManager);
  const treeView = vscode.window.createTreeView('jiraMyWork', {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });
  context.subscriptions.push(treeView);
  ```

**Acceptance Criteria:**
- ✅ Jira icon appears in activity bar
- ✅ Clicking icon shows My Work view
- ✅ Tree view displays properly
- ✅ View title is "My Work"

---

### Feature 4.4: Manual Refresh
**Priority:** P0
**Effort:** 2 hours

**Description:**
Add refresh button to tree view toolbar.

**Implementation Details:**
- Add command to package.json:
  ```json
  "commands": [
    {
      "command": "jira.refresh",
      "title": "Refresh",
      "icon": "$(refresh)"
    }
  ],
  "menus": {
    "view/title": [
      {
        "command": "jira.refresh",
        "when": "view == jiraMyWork",
        "group": "navigation"
      }
    ]
  }
  ```
- Implement command:
  ```typescript
  vscode.commands.registerCommand('jira.refresh', async () => {
    await vscode.window.withProgress({
      location: { viewId: 'jiraMyWork' },
      title: 'Refreshing Jira tickets...'
    }, async () => {
      // Clear cache
      cacheManager.invalidate('assignedIssues');
      // Refresh tree
      treeProvider.refresh();
    });
  });
  ```

**Acceptance Criteria:**
- ✅ Refresh button visible in view toolbar
- ✅ Clicking refresh reloads issues
- ✅ Progress indicator shown during refresh
- ✅ Cache cleared on refresh

---

### Feature 4.5: Auto Refresh
**Priority:** P0
**Effort:** 3 hours

**Description:**
Implement automatic refresh on configurable interval.

**Implementation Details:**
- Add refresh timer to tree provider:
  ```typescript
  export class JiraTreeProvider {
    private refreshTimer?: NodeJS.Timer;

    startAutoRefresh() {
      this.stopAutoRefresh();
      const interval = this.configManager.autoRefreshInterval;
      if (interval > 0) {
        this.refreshTimer = setInterval(() => {
          this.refresh();
        }, interval * 1000);
      }
    }

    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = undefined;
      }
    }

    updateRefreshInterval() {
      this.startAutoRefresh(); // Restart with new interval
    }
  }
  ```
- Start auto-refresh on activation
- Stop on deactivation
- Show last refresh time in status bar

**Acceptance Criteria:**
- ✅ Tree auto-refreshes at configured interval
- ✅ Interval configurable in settings
- ✅ Setting to 0 disables auto-refresh
- ✅ Last refresh time displayed
- ✅ Auto-refresh stops on deactivation

---

### Feature 4.6: Loading States
**Priority:** P0
**Effort:** 3 hours

**Description:**
Show loading indicators during data fetching.

**Implementation Details:**
- Add loading state to tree provider:
  ```typescript
  export class JiraTreeProvider {
    private isLoading: boolean = false;

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
      if (!element && this.isLoading) {
        return [new TreeItem('Loading...', vscode.TreeItemCollapsibleState.None)];
      }

      this.isLoading = true;
      try {
        // Fetch data...
        return items;
      } catch (error) {
        return [new TreeItem(
          `Error: ${error.message}`,
          vscode.TreeItemCollapsibleState.None
        )];
      } finally {
        this.isLoading = false;
      }
    }
  }
  ```
- Show progress in tree view
- Use VS Code progress API for long operations
- Disable refresh button while loading

**Acceptance Criteria:**
- ✅ Loading indicator shown during fetch
- ✅ Tree shows "Loading..." placeholder
- ✅ Error states displayed properly
- ✅ Can't trigger multiple simultaneous refreshes

---

### Feature 4.7: Empty State
**Priority:** P0
**Effort:** 2 hours

**Description:**
Show helpful message when no issues are assigned.

**Implementation Details:**
- Check for empty results:
  ```typescript
  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      const issues = await this.jiraClient.getAssignedIssues();
      if (issues.length === 0) {
        return [
          new TreeItem(
            'No issues assigned to you',
            vscode.TreeItemCollapsibleState.None
          )
        ];
      }
      return this.getStatusGroups(issues);
    }
    // ...
  }
  ```
- Add welcome view in package.json:
  ```json
  "viewsWelcome": [
    {
      "view": "jiraMyWork",
      "contents": "No issues assigned to you.\n[Refresh](command:jira.refresh)\n[Configure Extension](command:jira.configure)"
    }
  ]
  ```

**Acceptance Criteria:**
- ✅ Empty state message shows when no issues
- ✅ Welcome view with helpful actions
- ✅ Can refresh or configure from empty state

---

### Feature 4.8: View in Jira Action
**Priority:** P0
**Effort:** 2 hours

**Description:**
Add context menu action to open issue in browser.

**Implementation Details:**
- Add command:
  ```typescript
  vscode.commands.registerCommand('jira.openIssue', async (issueKey: string) => {
    const url = `${configManager.instanceUrl}/browse/${issueKey}`;
    await vscode.env.openExternal(vscode.Uri.parse(url));
  });
  ```
- Add to package.json:
  ```json
  "menus": {
    "view/item/context": [
      {
        "command": "jira.openIssue",
        "when": "view == jiraMyWork && viewItem == issue",
        "group": "navigation@1"
      }
    ]
  }
  ```

**Acceptance Criteria:**
- ✅ Context menu shows "Open in Jira"
- ✅ Clicking opens issue in default browser
- ✅ Correct URL constructed
- ✅ Only visible on issue items

---

### Feature 4.9: Copy Ticket ID Action
**Priority:** P0
**Effort:** 1 hour

**Description:**
Add context menu action to copy issue key to clipboard.

**Implementation Details:**
- Add command:
  ```typescript
  vscode.commands.registerCommand('jira.copyIssueKey', async (item: IssueItem) => {
    await vscode.env.clipboard.writeText(item.issue.key);
    vscode.window.showInformationMessage(`Copied ${item.issue.key} to clipboard`);
  });
  ```
- Add to context menu in package.json

**Acceptance Criteria:**
- ✅ Context menu shows "Copy Issue Key"
- ✅ Issue key copied to clipboard
- ✅ Success notification shown
- ✅ Only visible on issue items

---

## Epic 5: My Work View - Filtering & Actions

### Feature 5.1: Filter by Issue Type
**Priority:** P0
**Effort:** 4 hours

**Description:**
Add filter to show only specific issue types (Bug, Story, Task, etc.).

**Implementation Details:**
- Add filter state to tree provider:
  ```typescript
  export class JiraTreeProvider {
    private filters = {
      issueTypes: new Set<string>(),
      priorities: new Set<string>(),
      sprints: new Set<string>()
    };

    async filterByIssueType() {
      const allTypes = ['Bug', 'Story', 'Task', 'Epic', 'Subtask'];
      const selected = await vscode.window.showQuickPick(allTypes, {
        canPickMany: true,
        placeHolder: 'Select issue types to show'
      });

      if (selected) {
        this.filters.issueTypes = new Set(selected);
        this.refresh();
      }
    }

    private applyFilters(issues: JiraIssue[]): JiraIssue[] {
      return issues.filter(issue => {
        if (this.filters.issueTypes.size > 0 &&
            !this.filters.issueTypes.has(issue.fields.issuetype.name)) {
          return false;
        }
        // Apply other filters...
        return true;
      });
    }
  }
  ```
- Add filter command and button to view toolbar

**Acceptance Criteria:**
- ✅ Can select multiple issue types
- ✅ Tree shows only filtered types
- ✅ Filter state persists during session
- ✅ Clear filters option available

---

### Feature 5.2: Filter by Priority
**Priority:** P0
**Effort:** 3 hours

**Description:**
Add filter to show only specific priorities.

**Implementation Details:**
- Similar to issue type filter
- Quick pick for priorities (Highest, High, Medium, Low, Lowest)
- Apply in applyFilters method
- Add to view toolbar

**Acceptance Criteria:**
- ✅ Can select multiple priorities
- ✅ Tree shows only filtered priorities
- ✅ Filter combines with issue type filter
- ✅ Clear filters option available

---

### Feature 5.3: Filter by Sprint
**Priority:** P0
**Effort:** 4 hours

**Description:**
Add filter to show only issues from specific sprints.

**Implementation Details:**
- Fetch active sprints from API
- Show sprint picker
- Filter issues by sprint field
- Handle issues not in any sprint

**Acceptance Criteria:**
- ✅ Can select sprint from list
- ✅ Shows active and future sprints
- ✅ Option to show issues without sprint
- ✅ Filter combines with other filters

---

### Feature 5.4: Filter Persistence
**Priority:** P0
**Effort:** 2 hours

**Description:**
Save filter state across VS Code sessions.

**Implementation Details:**
- Use workspace state or global state:
  ```typescript
  export class JiraTreeProvider {
    constructor(
      private context: vscode.ExtensionContext,
      // ...
    ) {
      this.loadFilters();
    }

    private async loadFilters() {
      const saved = this.context.workspaceState.get('jira.filters');
      if (saved) {
        this.filters = saved;
      }
    }

    private async saveFilters() {
      await this.context.workspaceState.update('jira.filters', this.filters);
    }
  }
  ```

**Acceptance Criteria:**
- ✅ Filters saved when changed
- ✅ Filters restored on activation
- ✅ Workspace-specific filter state
- ✅ Can clear saved filters

---

### Feature 5.5: Search/Filter Input
**Priority:** P0
**Effort:** 3 hours

**Description:**
Add search box to filter issues by text.

**Implementation Details:**
- Add input box command
- Filter issues by text match in:
  - Issue key
  - Summary
  - Description
- Real-time filtering as user types
- Clear search button

**Acceptance Criteria:**
- ✅ Search box in view toolbar
- ✅ Filters as user types
- ✅ Searches key and summary
- ✅ Can clear search
- ✅ Combines with other filters

---

### Feature 5.6: Change Status Action
**Priority:** P0
**Effort:** 5 hours

**Description:**
Add context menu action to change issue status.

**Implementation Details:**
- Fetch available transitions:
  ```typescript
  vscode.commands.registerCommand('jira.changeStatus', async (item: IssueItem) => {
    const transitions = await jiraClient.getAvailableTransitions(item.issue.key);

    const selected = await vscode.window.showQuickPick(
      transitions.map(t => ({
        label: t.name,
        description: `${item.issue.fields.status.name} → ${t.to.name}`,
        transition: t
      })),
      { placeHolder: 'Select new status' }
    );

    if (selected) {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Updating ${item.issue.key}...`
      }, async () => {
        await jiraClient.transitionIssue(
          item.issue.key,
          selected.transition.id
        );
        treeProvider.refresh();
        vscode.window.showInformationMessage(
          `${item.issue.key} moved to ${selected.transition.to.name}`
        );
      });
    }
  });
  ```

**Acceptance Criteria:**
- ✅ Shows available status transitions
- ✅ Displays current and target status
- ✅ Updates issue in Jira
- ✅ Refreshes tree view
- ✅ Shows success notification
- ✅ Error handling for failed transitions

---

### Feature 5.7: Add Comment Action
**Priority:** P0
**Effort:** 3 hours

**Description:**
Add context menu action to add comment to issue.

**Implementation Details:**
- Show input box for comment:
  ```typescript
  vscode.commands.registerCommand('jira.addComment', async (item: IssueItem) => {
    const comment = await vscode.window.showInputBox({
      prompt: `Add comment to ${item.issue.key}`,
      placeHolder: 'Enter your comment...',
      validateInput: (value) => {
        return value.length > 0 ? null : 'Comment cannot be empty';
      }
    });

    if (comment) {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Adding comment to ${item.issue.key}...`
      }, async () => {
        await jiraClient.addComment(item.issue.key, comment);
        vscode.window.showInformationMessage(
          `Comment added to ${item.issue.key}`
        );
      });
    }
  });
  ```

**Acceptance Criteria:**
- ✅ Input box for comment text
- ✅ Validates non-empty comment
- ✅ Adds comment to Jira
- ✅ Shows success notification
- ✅ Error handling

---

### Feature 5.8: Keyboard Shortcuts
**Priority:** P0
**Effort:** 2 hours

**Description:**
Add keyboard shortcuts for common actions.

**Implementation Details:**
- Define keybindings in package.json:
  ```json
  "keybindings": [
    {
      "command": "jira.refresh",
      "key": "ctrl+shift+r",
      "mac": "cmd+shift+r",
      "when": "view == jiraMyWork"
    },
    {
      "command": "jira.createBug",
      "key": "ctrl+shift+b",
      "mac": "cmd+shift+b"
    },
    {
      "command": "jira.openIssue",
      "key": "enter",
      "when": "view == jiraMyWork && viewItem == issue"
    }
  ]
  ```

**Acceptance Criteria:**
- ✅ Refresh: Ctrl/Cmd+Shift+R
- ✅ Create Bug: Ctrl/Cmd+Shift+B
- ✅ Open Issue: Enter
- ✅ Shortcuts documented
- ✅ Work only in appropriate context

---

## Epic 6: Quick Ticket Creation - UI & Workflow

### Feature 6.1: Webview Panel Setup
**Priority:** P0
**Effort:** 4 hours

**Description:**
Create reusable webview panel for ticket creation forms.

**Implementation Details:**
- Create `src/providers/CreateIssueWebviewProvider.ts`:
  ```typescript
  export class CreateIssueWebviewProvider {
    private panel?: vscode.WebviewPanel;

    constructor(
      private context: vscode.ExtensionContext,
      private jiraClient: JiraClient
    ) {}

    async show(issueType: string) {
      if (this.panel) {
        this.panel.reveal();
      } else {
        this.panel = vscode.window.createWebviewPanel(
          'jiraCreateIssue',
          `Create ${issueType}`,
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true
          }
        );

        this.panel.webview.html = this.getHtmlContent(issueType);
        this.panel.webview.onDidReceiveMessage(
          this.handleMessage.bind(this)
        );

        this.panel.onDidDispose(() => {
          this.panel = undefined;
        });
      }
    }

    private getHtmlContent(issueType: string): string {
      // Return HTML form
    }

    private async handleMessage(message: any) {
      switch (message.command) {
        case 'submit':
          await this.createIssue(message.data);
          break;
        case 'cancel':
          this.panel?.dispose();
          break;
      }
    }
  }
  ```

**Acceptance Criteria:**
- ✅ Webview panel opens correctly
- ✅ Panel titled appropriately
- ✅ Can send/receive messages
- ✅ Disposed properly on close

---

### Feature 6.2: Form UI Design
**Priority:** P0
**Effort:** 6 hours

**Description:**
Design and implement HTML/CSS for ticket creation forms using VS Code theming.

**Implementation Details:**
- Create HTML template with VS Code CSS variables:
  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background-color: var(--vscode-editor-background);
        padding: 20px;
      }
      .form-group {
        margin-bottom: 16px;
      }
      label {
        display: block;
        margin-bottom: 4px;
        font-weight: 600;
      }
      input, textarea, select {
        width: 100%;
        padding: 8px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 2px;
      }
      button {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        margin-right: 8px;
      }
      button:hover {
        background: var(--vscode-button-hoverBackground);
      }
      .required {
        color: var(--vscode-errorForeground);
      }
    </style>
  </head>
  <body>
    <form id="createIssueForm">
      <!-- Form fields -->
    </form>
    <script>
      const vscode = acquireVsCodeApi();
      // Form logic
    </script>
  </body>
  </html>
  ```
- Responsive layout
- VS Code theme integration
- Form validation UI

**Acceptance Criteria:**
- ✅ Form matches VS Code theme
- ✅ Responsive design
- ✅ Clear field labels
- ✅ Required fields marked
- ✅ Validation messages visible

---

### Feature 6.3: Bug Against Feature Workflow
**Priority:** P0
**Effort:** 6 hours

**Description:**
Implement specialized form for creating bugs linked to features.

**Implementation Details:**
- Fetch feature epics from config
- Dynamic form fields:
  ```typescript
  interface BugFormData {
    project: string;        // Pre-populated from config
    issueType: 'Bug';      // Fixed
    summary: string;        // Required
    description: string;    // Required
    featureEpic: string;   // Required - dropdown
    priority: string;       // Optional - dropdown
    reporter: string;       // Pre-populated (current user)
  }
  ```
- Feature epic dropdown with autocomplete
- Pre-populate project and reporter
- Validate all required fields
- Submit via API

**Acceptance Criteria:**
- ✅ Form pre-populated with defaults
- ✅ Feature epic dropdown populated
- ✅ Summary and description required
- ✅ Bug created with feature link
- ✅ Success notification with link
- ✅ Form clears after successful creation

---

### Feature 6.4: Internal Defect Workflow
**Priority:** P0
**Effort:** 4 hours

**Description:**
Implement simplified form for internal defects not tied to features.

**Implementation Details:**
- Minimal form fields:
  ```typescript
  interface DefectFormData {
    project: string;
    issueType: 'Bug';
    summary: string;
    description: string;
    priority: string;  // Optional
  }
  ```
- Faster creation workflow
- Skip feature assignment
- Optional priority selection

**Acceptance Criteria:**
- ✅ Simplified form (fewer fields)
- ✅ Only summary and description required
- ✅ Creates bug without feature link
- ✅ Sub-30 second workflow
- ✅ Success notification

---

### Feature 6.5: Other Issue Types (Story, Task, Subtask)
**Priority:** P0
**Effort:** 6 hours

**Description:**
Support creating other issue types with dynamic forms.

**Implementation Details:**
- Fetch issue type metadata from Jira:
  ```typescript
  async function getFormFields(projectKey: string, issueType: string) {
    const metadata = await jiraClient.getCreateMetadata(projectKey, issueType);
    return metadata.projects[0].issuetypes[0].fields;
  }
  ```
- Generate form dynamically based on metadata
- Support common field types:
  - Text input
  - Text area
  - Dropdown
  - Multi-select
  - Date picker
  - User picker
- Handle required vs optional fields
- Type-specific validation

**Acceptance Criteria:**
- ✅ Can create Story, Task, Subtask
- ✅ Form fields dynamic based on Jira config
- ✅ Required fields enforced
- ✅ All field types supported
- ✅ Successfully creates issues

---

### Feature 6.6: Field Validation
**Priority:** P0
**Effort:** 4 hours

**Description:**
Implement client-side and server-side validation for all form fields.

**Implementation Details:**
- Client-side validation:
  ```typescript
  function validateForm(data: any, fields: any[]): ValidationResult {
    const errors: string[] = [];

    fields.forEach(field => {
      if (field.required && !data[field.key]) {
        errors.push(`${field.name} is required`);
      }

      // Type-specific validation
      if (field.schema.type === 'string' && field.schema.maxLength) {
        if (data[field.key]?.length > field.schema.maxLength) {
          errors.push(`${field.name} exceeds maximum length`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  }
  ```
- Real-time validation as user types
- Submit button disabled until valid
- Server-side validation errors shown clearly
- Highlight invalid fields

**Acceptance Criteria:**
- ✅ Required fields validated
- ✅ Field type validation works
- ✅ Real-time feedback
- ✅ Can't submit invalid form
- ✅ Server errors displayed clearly
- ✅ Invalid fields highlighted

---

### Feature 6.7: Form Submission Logic
**Priority:** P0
**Effort:** 4 hours

**Description:**
Handle form submission, API calls, and response handling.

**Implementation Details:**
- Submit handler:
  ```typescript
  async function handleSubmit(formData: any) {
    // Show progress
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Creating issue...'
    }, async () => {
      try {
        const issue = await jiraClient.createIssue(formData);

        // Success notification with actions
        const action = await vscode.window.showInformationMessage(
          `Created ${issue.key}`,
          'Open in Jira',
          'View in Tree'
        );

        if (action === 'Open in Jira') {
          vscode.commands.executeCommand('jira.openIssue', issue.key);
        } else if (action === 'View in Tree') {
          treeProvider.refresh();
        }

        // Close form or clear for next
        webviewProvider.close();

      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to create issue: ${error.message}`
        );
      }
    });
  }
  ```

**Acceptance Criteria:**
- ✅ Progress shown during creation
- ✅ Success notification with actions
- ✅ Can open created issue
- ✅ Tree view can be refreshed
- ✅ Form closes on success
- ✅ Errors handled gracefully

---

### Feature 6.8: Command Registration
**Priority:** P0
**Effort:** 2 hours

**Description:**
Register commands in command palette for all ticket creation workflows.

**Implementation Details:**
- Add to package.json:
  ```json
  "commands": [
    {
      "command": "jira.createBug",
      "title": "Jira: Create Bug Against Feature"
    },
    {
      "command": "jira.createDefect",
      "title": "Jira: Create Internal Defect"
    },
    {
      "command": "jira.createStory",
      "title": "Jira: Create Story"
    },
    {
      "command": "jira.createTask",
      "title": "Jira: Create Task"
    }
  ]
  ```
- Register command handlers in extension.ts

**Acceptance Criteria:**
- ✅ All commands in command palette
- ✅ Commands open appropriate forms
- ✅ Titles are clear and descriptive
- ✅ Commands accessible via keyboard

---

### Feature 6.9: Sidebar Create Button
**Priority:** P0
**Effort:** 2 hours

**Description:**
Add create button to My Work view toolbar.

**Implementation Details:**
- Add button to view toolbar:
  ```json
  "menus": {
    "view/title": [
      {
        "command": "jira.createBug",
        "when": "view == jiraMyWork",
        "group": "navigation"
      }
    ]
  }
  ```
- Show quick pick for issue type selection:
  ```typescript
  async function showCreateMenu() {
    const selected = await vscode.window.showQuickPick([
      { label: 'Bug Against Feature', command: 'jira.createBug' },
      { label: 'Internal Defect', command: 'jira.createDefect' },
      { label: 'Story', command: 'jira.createStory' },
      { label: 'Task', command: 'jira.createTask' }
    ]);

    if (selected) {
      vscode.commands.executeCommand(selected.command);
    }
  }
  ```

**Acceptance Criteria:**
- ✅ Create button in view toolbar
- ✅ Quick pick shows issue types
- ✅ Selecting type opens form
- ✅ Button icon clear

---

## Epic 7: Investigate with Copilot

### Feature 7.1: Context Menu Integration
**Priority:** P0
**Effort:** 2 hours

**Description:**
Add "Investigate with Copilot" action to tree view context menu.

**Implementation Details:**
- Register command:
  ```typescript
  vscode.commands.registerCommand(
    'jira.investigateWithCopilot',
    async (item: IssueItem) => {
      await investigateCopilot(item.issue.key);
    }
  );
  ```
- Add to context menu:
  ```json
  "menus": {
    "view/item/context": [
      {
        "command": "jira.investigateWithCopilot",
        "when": "view == jiraMyWork && viewItem == issue",
        "group": "copilot@1"
      }
    ]
  }
  ```

**Acceptance Criteria:**
- ✅ Context menu shows command
- ✅ Only visible on issue items
- ✅ Command executes correctly
- ✅ Clear menu label

---

### Feature 7.2: Fetch Full Issue Details
**Priority:** P0
**Effort:** 4 hours

**Description:**
Fetch comprehensive issue details including comments, attachments, and related issues.

**Implementation Details:**
- Extend existing getIssueDetails method
- Fetch additional data:
  ```typescript
  async function getFullIssueContext(issueKey: string): Promise<IssueContext> {
    const issue = await jiraClient.getIssueDetails(issueKey);

    // Extract acceptance criteria from description or custom field
    const acceptanceCriteria = extractAcceptanceCriteria(issue);

    // Get comments (filter out system comments)
    const comments = issue.fields.comment.comments.filter(
      c => !c.author.accountType === 'atlassian'
    );

    // Get related issues (linked issues, subtasks, parent)
    const related = [
      ...issue.fields.subtasks || [],
      ...issue.fields.issuelinks?.map(l => l.inwardIssue || l.outwardIssue) || [],
      issue.fields.parent
    ].filter(Boolean);

    // Get attachments metadata
    const attachments = issue.fields.attachment || [];

    return {
      issue,
      acceptanceCriteria,
      comments,
      related,
      attachments
    };
  }
  ```

**Acceptance Criteria:**
- ✅ Fetches complete issue details
- ✅ Includes comments
- ✅ Includes related issues
- ✅ Includes attachments metadata
- ✅ Extracts acceptance criteria
- ✅ Handles missing data gracefully

---

### Feature 7.3: Markdown Generation
**Priority:** P0
**Effort:** 5 hours

**Description:**
Generate well-formatted markdown file optimized for Copilot context.

**Implementation Details:**
- Create markdown generator:
  ```typescript
  function generateContextMarkdown(context: IssueContext): string {
    const { issue, acceptanceCriteria, comments, related, attachments } = context;

    let md = `# [${issue.key}] ${issue.fields.summary}\n\n`;

    // Metadata
    md += `**Status:** ${issue.fields.status.name}  \n`;
    md += `**Priority:** ${issue.fields.priority.name}  \n`;
    md += `**Type:** ${issue.fields.issuetype.name}  \n`;
    md += `**Assignee:** ${issue.fields.assignee?.displayName || 'Unassigned'}  \n`;
    md += `**Reporter:** ${issue.fields.reporter.displayName}  \n\n`;

    // Description
    md += `## Description\n\n`;
    md += convertADFToMarkdown(issue.fields.description) + '\n\n';

    // Acceptance Criteria
    if (acceptanceCriteria) {
      md += `## Acceptance Criteria\n\n`;
      md += acceptanceCriteria + '\n\n';
    }

    // Comments/Discussion
    if (comments.length > 0) {
      md += `## Discussion\n\n`;
      comments.forEach(comment => {
        md += `### ${comment.author.displayName} - ${formatDate(comment.created)}\n\n`;
        md += convertADFToMarkdown(comment.body) + '\n\n';
      });
    }

    // Related Issues
    if (related.length > 0) {
      md += `## Related Issues\n\n`;
      related.forEach(rel => {
        md += `- [${rel.key}](${getIssueUrl(rel.key)}): ${rel.fields.summary}\n`;
      });
      md += '\n';
    }

    // Attachments
    if (attachments.length > 0) {
      md += `## Attachments\n\n`;
      attachments.forEach(att => {
        md += `- [${att.filename}](${att.content})\n`;
      });
      md += '\n';
    }

    // Jira Link
    md += `## Jira Link\n\n`;
    md += `[Open in Jira](${getIssueUrl(issue.key)})\n`;

    return md;
  }

  function convertADFToMarkdown(adf: any): string {
    // Convert Atlassian Document Format to Markdown
    // Handle paragraphs, lists, code blocks, etc.
  }
  ```

**Acceptance Criteria:**
- ✅ Markdown properly formatted
- ✅ All sections included
- ✅ ADF converted to markdown correctly
- ✅ Links functional
- ✅ Code-friendly formatting
- ✅ Copilot can parse effectively

---

### Feature 7.4: File Creation and Storage
**Priority:** P0
**Effort:** 3 hours

**Description:**
Save markdown file to configured location in workspace.

**Implementation Details:**
- Create directory and file:
  ```typescript
  async function saveContextFile(issueKey: string, markdown: string): Promise<string> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder open');
    }

    const contextDir = path.join(
      workspaceRoot,
      configManager.contextFileLocation
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    // Write file
    const filePath = path.join(contextDir, `${issueKey}.md`);
    fs.writeFileSync(filePath, markdown, 'utf-8');

    return filePath;
  }
  ```
- Add .jira to .gitignore automatically
- Handle file conflicts (overwrite or create new)

**Acceptance Criteria:**
- ✅ Creates directory if missing
- ✅ Saves file to correct location
- ✅ Filename matches issue key
- ✅ Handles existing files
- ✅ Updates .gitignore

---

### Feature 7.5: Copilot Context Integration
**Priority:** P0
**Effort:** 3 hours

**Description:**
Add generated markdown to Copilot workspace context automatically.

**Implementation Details:**
- Open file in editor:
  ```typescript
  async function addToCopilotContext(filePath: string) {
    // Open file in editor (adds to Copilot context)
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside
    });

    // Optionally: Use Copilot API to explicitly add to context
    // (if such API exists in future)
  }
  ```
- File opened in editor is automatically in Copilot's context
- Optionally pin file to keep in context

**Acceptance Criteria:**
- ✅ File opens in editor
- ✅ Copilot can access file content
- ✅ Opens in split view (beside)
- ✅ Not in preview mode

---

### Feature 7.6: User Notifications
**Priority:** P0
**Effort:** 2 hours

**Description:**
Notify user when context file is ready and provide actions.

**Implementation Details:**
- Show notification with actions:
  ```typescript
  async function investigateWithCopilot(issueKey: string) {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Fetching ${issueKey} details...`
    }, async () => {
      const context = await getFullIssueContext(issueKey);
      const markdown = generateContextMarkdown(context);
      const filePath = await saveContextFile(issueKey, markdown);
      await addToCopilotContext(filePath);
    });

    const action = await vscode.window.showInformationMessage(
      `${issueKey} context ready for Copilot`,
      'Open in Jira',
      'Ask Copilot'
    );

    if (action === 'Open in Jira') {
      vscode.commands.executeCommand('jira.openIssue', issueKey);
    } else if (action === 'Ask Copilot') {
      vscode.commands.executeCommand('workbench.action.chat.open');
    }
  }
  ```

**Acceptance Criteria:**
- ✅ Progress shown during fetch
- ✅ Success notification with actions
- ✅ Can open in Jira
- ✅ Can open Copilot chat
- ✅ Clear messaging

---

### Feature 7.7: Caching Investigation Results
**Priority:** P0
**Effort:** 2 hours

**Description:**
Cache investigation results to avoid redundant API calls.

**Implementation Details:**
- Check cache before fetching:
  ```typescript
  async function investigateWithCopilot(issueKey: string, force: boolean = false) {
    const cacheKey = `context:${issueKey}`;

    if (!force) {
      // Check if file already exists and is recent
      const filePath = getContextFilePath(issueKey);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const age = Date.now() - stats.mtimeMs;

        // If less than 1 hour old, just open it
        if (age < 3600000) {
          await addToCopilotContext(filePath);
          vscode.window.showInformationMessage(
            `Using cached context for ${issueKey}`
          );
          return;
        }
      }
    }

    // Fetch fresh data...
  }
  ```
- Option to force refresh
- Show cache age in notification

**Acceptance Criteria:**
- ✅ Reuses existing files if recent
- ✅ Cache expiry configurable
- ✅ Can force refresh
- ✅ User aware of cache usage

---

### Feature 7.8: Command Palette Command
**Priority:** P0
**Effort:** 2 hours

**Description:**
Add command palette command to investigate any issue by key.

**Implementation Details:**
- Register command:
  ```typescript
  vscode.commands.registerCommand(
    'jira.investigateTicket',
    async () => {
      const issueKey = await vscode.window.showInputBox({
        prompt: 'Enter Jira issue key',
        placeHolder: 'PROJ-123',
        validateInput: (value) => {
          if (!/^[A-Z]+-\d+$/.test(value)) {
            return 'Invalid issue key format';
          }
          return null;
        }
      });

      if (issueKey) {
        await investigateWithCopilot(issueKey);
      }
    }
  );
  ```
- Add to package.json commands

**Acceptance Criteria:**
- ✅ Command in command palette
- ✅ Input validation for issue key
- ✅ Works for any accessible issue
- ✅ Same behavior as context menu action

---

## Epic 8 & 9: Copilot Tools Integration

### Feature 8.1: Language Model Tools API Research
**Priority:** P1
**Effort:** 4 hours

**Description:**
Research and understand VS Code Language Model Tools API.

**Implementation Details:**
- Study VS Code API documentation
- Review example extensions
- Understand tool registration process
- Understand tool execution model
- Test basic tool implementation

**Acceptance Criteria:**
- ✅ API documentation reviewed
- ✅ Example code studied
- ✅ Basic proof of concept working
- ✅ Technical approach documented

---

### Feature 8.2: Tools Provider Implementation
**Priority:** P1
**Effort:** 5 hours

**Description:**
Implement base infrastructure for registering and executing Copilot tools.

**Implementation Details:**
- Create tools provider (structure TBD based on API)
- Register extension as tool provider
- Implement tool discovery/registration system
- Handle tool invocation routing
- Set up authentication context for tools

**Acceptance Criteria:**
- ✅ Extension registers as tool provider
- ✅ Tools discoverable by Copilot
- ✅ Tool execution routing works
- ✅ Authentication available to tools

---

### Feature 8.3: Tool: Add Comment
**Priority:** P1
**Effort:** 4 hours

**Description:**
Implement Copilot tool for adding comments to issues.

**Implementation Details:**
- Tool definition:
  ```typescript
  {
    name: 'jira_add_comment',
    description: 'Add a comment to a Jira issue. Use this when you want to document progress, add context, or respond to discussion on a ticket.',
    parameters: {
      issueKey: {
        type: 'string',
        description: 'The Jira issue key (e.g., PROJ-123)',
        required: true
      },
      comment: {
        type: 'string',
        description: 'The comment text to add',
        required: true
      }
    }
  }
  ```
- Implementation:
  ```typescript
  async function addCommentTool(params: any): Promise<ToolResult> {
    const { issueKey, comment } = params;

    try {
      const result = await jiraClient.addComment(issueKey, comment);
      return {
        success: true,
        message: `Comment added to ${issueKey}`,
        data: { commentId: result.id }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  ```

**Acceptance Criteria:**
- ✅ Tool registered with clear description
- ✅ Parameters validated
- ✅ Adds comment successfully
- ✅ Returns success/failure status
- ✅ Copilot can invoke tool

---

### Feature 8.4: Tool: Update Status
**Priority:** P1
**Effort:** 5 hours

**Description:**
Implement Copilot tool for changing issue status.

**Implementation Details:**
- Tool must first get available transitions
- Map status names to transition IDs
- Execute transition
- Handle invalid status transitions

**Acceptance Criteria:**
- ✅ Tool registered
- ✅ Validates target status available
- ✅ Transitions issue successfully
- ✅ Error handling for invalid transitions
- ✅ Copilot understands when to use

---

### Feature 8.5: Tool: Link PR
**Priority:** P1
**Effort:** 4 hours

**Description:**
Implement Copilot tool for linking GitHub PRs to issues.

**Implementation Details:**
- Add web link to issue
- Support GitHub PR URLs
- Validate URL format
- Create remote link in Jira

**Acceptance Criteria:**
- ✅ Tool registered
- ✅ Validates PR URL
- ✅ Creates link in Jira
- ✅ Handles duplicate links
- ✅ Works with GitHub URLs

---

### Feature 8.6: Tool: Create Subtask
**Priority:** P1
**Effort:** 5 hours

**Description:**
Implement Copilot tool for creating subtasks.

**Implementation Details:**
- Validate parent issue exists
- Create subtask with parent link
- Support same parameters as regular issue creation
- Return created subtask key

**Acceptance Criteria:**
- ✅ Tool registered
- ✅ Creates subtask successfully
- ✅ Links to parent issue
- ✅ Returns subtask key
- ✅ Error handling

---

### Feature 8.7: Tool: Log Time (Optional)
**Priority:** P1
**Effort:** 3 hours

**Description:**
Implement Copilot tool for logging work time.

**Implementation Details:**
- Support time format (e.g., "2h 30m")
- Add work log to issue
- Optional work description
- Return logged time

**Acceptance Criteria:**
- ✅ Tool registered
- ✅ Parses time format
- ✅ Logs time successfully
- ✅ Optional description supported
- ✅ Returns confirmation

---

### Feature 8.8: Confirmation Flows
**Priority:** P1
**Effort:** 4 hours

**Description:**
Implement user confirmation for destructive operations.

**Implementation Details:**
- Identify destructive operations (status change, time logging)
- Show confirmation dialog before execution
- Allow user to approve/reject
- Support "always allow" option
- Configurable confirmation requirements

**Acceptance Criteria:**
- ✅ Destructive operations require confirmation
- ✅ Clear confirmation dialog
- ✅ User can approve or reject
- ✅ Configurable per operation type
- ✅ "Always allow" option works

---

### Feature 8.9: Tool Usage Documentation
**Priority:** P1
**Effort:** 3 hours

**Description:**
Document how to use Copilot tools with examples.

**Implementation Details:**
- Write usage guide
- Provide example prompts
- Document each tool's capabilities
- Include troubleshooting section
- Add to main README

**Acceptance Criteria:**
- ✅ Usage guide complete
- ✅ Example prompts provided
- ✅ Each tool documented
- ✅ Troubleshooting section included
- ✅ Clear and helpful

---

## Epic 10, 11, 12: Polish, Testing, Documentation

(These epics contain fewer granular features and more process-oriented work, so I'll provide high-level feature outlines)

### Feature 10.1-10.5: Error Handling Features
- Global error handler
- API-specific error handlers
- User-friendly error messages
- Retry logic implementation
- Status bar connection indicator

### Feature 11.1-11.6: Testing Features
- Unit test suites for each module
- Integration test scenarios
- Mock API setup
- Performance test suite
- Security audit checklist
- Cross-platform testing

### Feature 12.1-12.6: Documentation Features
- Comprehensive README
- Configuration guide
- User tutorial/walkthrough
- API documentation
- Troubleshooting guide
- Release preparation checklist

---

## Feature Dependency Graph

```
Foundation (1.x) → API Integration (2.x) → All Features
                ↓
          Configuration (3.x) → All Features
                ↓
          Tree View (4.x) → Filtering (5.x)
                ↓
          Tree View (4.x) → Investigate (7.x)
                ↓
          Ticket Creation (6.x)
                ↓
          Copilot Tools (8.x, 9.x)
                ↓
          Polish (10.x) + Testing (11.x) → Documentation (12.x)
```

---

## Total Feature Count: ~90 individual features
## Estimated Total Effort: ~320-380 hours (8-10 weeks for single developer)
