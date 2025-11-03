import * as vscode from 'vscode';

/**
 * Configuration validation result interface
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration Manager
 *
 * Provides type-safe access to extension configuration settings.
 * This wrapper class abstracts the VS Code configuration API and provides
 * convenient getters and setters for all extension settings.
 *
 * Settings are stored in VS Code's workspace/user settings and can be
 * edited via the Settings UI or settings.json file.
 *
 * @see package.json for schema definition of all configuration properties
 */
export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;
  private readonly configSection = 'jiraExtension';

  /**
   * Creates a new ConfigManager instance
   *
   * The configuration is loaded from VS Code's workspace configuration
   * and will automatically update if settings change during the session.
   */
  constructor() {
    this.config = vscode.workspace.getConfiguration(this.configSection);
  }

  /**
   * Refresh the configuration from VS Code
   *
   * Call this after configuration changes to ensure we have the latest values.
   * This is typically not needed as VS Code triggers events on config changes,
   * but can be useful in some scenarios.
   */
  refresh(): void {
    this.config = vscode.workspace.getConfiguration(this.configSection);
  }

  // ==================== Configuration Getters ====================

  /**
   * Get the Jira instance URL
   *
   * @returns The Jira instance URL (e.g., 'https://company.atlassian.net')
   *          Returns empty string if not configured.
   */
  get instanceUrl(): string {
    return this.config.get<string>('instanceUrl', '');
  }

  /**
   * Get the default project key for ticket creation
   *
   * @returns The project key (e.g., 'PROJ')
   *          Returns empty string if not configured.
   */
  get projectKey(): string {
    return this.config.get<string>('projectKey', '');
  }

  /**
   * Get the list of feature epic IDs for bug creation
   *
   * These epic IDs are used when creating bugs that need to be linked
   * to specific feature epics.
   *
   * @returns Array of epic IDs (e.g., ['PROJ-100', 'PROJ-101'])
   *          Returns empty array if not configured.
   */
  get featureEpics(): string[] {
    return this.config.get<string[]>('featureEpics', []);
  }

  /**
   * Get the auto-refresh interval in seconds
   *
   * Controls how often the tree view automatically refreshes to fetch
   * updated issue data from Jira.
   *
   * @returns Auto-refresh interval in seconds (0 to disable auto-refresh)
   *          Default: 300 seconds (5 minutes)
   */
  get autoRefreshInterval(): number {
    return this.config.get<number>('autoRefreshInterval', 300);
  }

  /**
   * Get the directory path for Copilot context files
   *
   * This directory is where issue context files are stored when using
   * the "Investigate with Copilot" feature.
   *
   * @returns Directory path relative to workspace root
   *          Default: '.jira'
   */
  get contextFileLocation(): string {
    return this.config.get<string>('contextFileLocation', '.jira');
  }

  /**
   * Get the context file cache expiry time in seconds
   *
   * When using "Investigate with Copilot", existing context files are reused
   * if they are younger than this expiry time. This prevents unnecessary API calls
   * for recently fetched issue data.
   *
   * @returns Cache expiry time in seconds
   *          Default: 3600 seconds (1 hour)
   */
  get contextFileCacheExpiry(): number {
    return this.config.get<number>('contextFileCacheExpiry', 3600);
  }

  /**
   * Check if Copilot tools integration is enabled
   *
   * When enabled, the extension provides tools that GitHub Copilot can use
   * to interact with Jira (add comments, update status, etc.)
   *
   * @returns true if Copilot tools are enabled, false otherwise
   *          Default: true
   */
  get enableCopilotTools(): boolean {
    return this.config.get<boolean>('enableCopilotTools', true);
  }

  /**
   * Get the maximum number of issues to fetch from Jira
   *
   * This limits the number of issues returned by API queries to prevent
   * performance issues with large result sets.
   *
   * @returns Maximum number of issues to fetch
   *          Default: 100
   */
  get maxIssues(): number {
    return this.config.get<number>('maxIssues', 100);
  }

  /**
   * Check if dummy data mode is enabled
   *
   * When enabled, the extension will use dummy data instead of making
   * real API calls to Jira. Useful for testing the UI without credentials.
   *
   * @returns true if dummy data mode is enabled, false otherwise
   *          Default: false
   */
  get useDummyData(): boolean {
    return this.config.get<boolean>('useDummyData', false);
  }

  // ==================== Configuration Setters ====================

  /**
   * Update a configuration value
   *
   * @param key - The configuration key (without the 'jiraExtension.' prefix)
   * @param value - The new value to set
   * @param global - If true, updates user settings; if false, updates workspace settings
   * @returns Promise that resolves when the configuration is updated
   *
   * @example
   * ```typescript
   * await configManager.update('projectKey', 'PROJ', false);
   * ```
   */
  async update(key: string, value: any, global: boolean = false): Promise<void> {
    const target = global
      ? vscode.ConfigurationTarget.Global
      : vscode.ConfigurationTarget.Workspace;

    await this.config.update(key, value, target);

    // Refresh config to ensure we have the latest values
    this.refresh();
  }

  /**
   * Update the Jira instance URL
   *
   * @param url - The Jira instance URL (e.g., 'https://company.atlassian.net')
   * @param global - If true, updates user settings; if false, updates workspace settings
   * @returns Promise that resolves when the configuration is updated
   */
  async setInstanceUrl(url: string, global: boolean = false): Promise<void> {
    await this.update('instanceUrl', url, global);
  }

  /**
   * Update the default project key
   *
   * @param projectKey - The project key (e.g., 'PROJ')
   * @param global - If true, updates user settings; if false, updates workspace settings
   * @returns Promise that resolves when the configuration is updated
   */
  async setProjectKey(projectKey: string, global: boolean = false): Promise<void> {
    await this.update('projectKey', projectKey, global);
  }

  /**
   * Update the feature epics list
   *
   * @param epics - Array of epic IDs (e.g., ['PROJ-100', 'PROJ-101'])
   * @param global - If true, updates user settings; if false, updates workspace settings
   * @returns Promise that resolves when the configuration is updated
   */
  async setFeatureEpics(epics: string[], global: boolean = false): Promise<void> {
    await this.update('featureEpics', epics, global);
  }

  /**
   * Update the auto-refresh interval
   *
   * @param seconds - Auto-refresh interval in seconds (0 to disable)
   * @param global - If true, updates user settings; if false, updates workspace settings
   * @returns Promise that resolves when the configuration is updated
   */
  async setAutoRefreshInterval(seconds: number, global: boolean = false): Promise<void> {
    await this.update('autoRefreshInterval', seconds, global);
  }

  /**
   * Update the context file location
   *
   * @param location - Directory path relative to workspace root
   * @param global - If true, updates user settings; if false, updates workspace settings
   * @returns Promise that resolves when the configuration is updated
   */
  async setContextFileLocation(location: string, global: boolean = false): Promise<void> {
    await this.update('contextFileLocation', location, global);
  }

  /**
   * Enable or disable Copilot tools integration
   *
   * @param enabled - true to enable, false to disable
   * @param global - If true, updates user settings; if false, updates workspace settings
   * @returns Promise that resolves when the configuration is updated
   */
  async setEnableCopilotTools(enabled: boolean, global: boolean = false): Promise<void> {
    await this.update('enableCopilotTools', enabled, global);
  }

  /**
   * Update the maximum number of issues to fetch
   *
   * @param maxIssues - Maximum number of issues to fetch
   * @param global - If true, updates user settings; if false, updates workspace settings
   * @returns Promise that resolves when the configuration is updated
   */
  async setMaxIssues(maxIssues: number, global: boolean = false): Promise<void> {
    await this.update('maxIssues', maxIssues, global);
  }

  /**
   * Enable or disable dummy data mode
   *
   * @param enabled - true to enable dummy data mode, false to use real API
   * @param global - If true, updates user settings; if false, updates workspace settings
   * @returns Promise that resolves when the configuration is updated
   */
  async setUseDummyData(enabled: boolean, global: boolean = false): Promise<void> {
    await this.update('useDummyData', enabled, global);
  }

  // ==================== Validation ====================

  /**
   * Validate the current configuration
   *
   * Checks all configuration values for validity and returns a structured
   * result with any errors or warnings found.
   *
   * Note: This is a basic validation method. Full validation including
   * API connection testing will be implemented in Feature 3.4.
   *
   * @returns Promise with ConfigValidationResult containing validation status
   */
  async validate(): Promise<ConfigValidationResult> {
    const result: ConfigValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Validate instance URL
    const instanceUrl = this.instanceUrl;
    if (!instanceUrl) {
      result.warnings.push('Instance URL is not configured. Run "Jira: Configure" to set it up.');
    } else if (!instanceUrl.startsWith('https://')) {
      result.valid = false;
      result.errors.push('Instance URL must start with https://');
    } else if (instanceUrl.endsWith('/')) {
      result.warnings.push('Instance URL should not end with a trailing slash. It will be removed automatically.');
    }

    // Validate project key
    const projectKey = this.projectKey;
    if (!projectKey) {
      result.warnings.push('Default project key is not set. You will need to select a project when creating issues.');
    } else if (!/^[A-Z][A-Z0-9]*$/.test(projectKey)) {
      result.warnings.push(`Project key '${projectKey}' does not match typical Jira project key format (uppercase letters and numbers).`);
    }

    // Validate auto-refresh interval
    const autoRefreshInterval = this.autoRefreshInterval;
    if (autoRefreshInterval < 0) {
      result.valid = false;
      result.errors.push('Auto-refresh interval must be greater than or equal to 0 (0 disables auto-refresh).');
    } else if (autoRefreshInterval > 0 && autoRefreshInterval < 30) {
      result.warnings.push('Auto-refresh interval is very short. This may cause excessive API calls and rate limiting.');
    }

    // Validate max issues
    const maxIssues = this.maxIssues;
    if (maxIssues <= 0) {
      result.valid = false;
      result.errors.push('Maximum issues must be greater than 0.');
    } else if (maxIssues > 1000) {
      result.warnings.push('Maximum issues is very large. This may cause performance issues.');
    }

    // Validate context file location
    const contextFileLocation = this.contextFileLocation;
    if (!contextFileLocation) {
      result.valid = false;
      result.errors.push('Context file location must not be empty.');
    } else if (contextFileLocation.startsWith('/') || contextFileLocation.startsWith('\\')) {
      result.warnings.push('Context file location should be a relative path from the workspace root.');
    }

    return result;
  }

  /**
   * Check if the basic configuration is complete
   *
   * Returns true if the minimum required configuration is present
   * (instance URL and project key). This is a quick check and does not
   * validate the actual values or test API connectivity.
   *
   * @returns true if basic configuration is complete, false otherwise
   */
  isConfigured(): boolean {
    return this.instanceUrl.length > 0 && this.projectKey.length > 0;
  }

  /**
   * Get a human-readable summary of the current configuration
   *
   * Useful for displaying in the UI or for debugging purposes.
   * Note: Does not include sensitive information like API tokens.
   *
   * @returns Object with current configuration values
   */
  getSummary(): Record<string, any> {
    return {
      instanceUrl: this.instanceUrl || '(not set)',
      projectKey: this.projectKey || '(not set)',
      featureEpics: this.featureEpics.length > 0 ? this.featureEpics : '(none)',
      autoRefreshInterval: this.autoRefreshInterval === 0
        ? 'disabled'
        : `${this.autoRefreshInterval} seconds`,
      contextFileLocation: this.contextFileLocation,
      enableCopilotTools: this.enableCopilotTools,
      maxIssues: this.maxIssues,
      useDummyData: this.useDummyData
    };
  }
}
