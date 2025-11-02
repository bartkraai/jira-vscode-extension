import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager';
import { AuthManager } from '../api/AuthManager';
import { JiraClient } from '../api/JiraClient';

/**
 * Configuration Change Handler
 *
 * Listens for configuration changes and updates extension behavior accordingly.
 * Handles changes to instance URL, project key, refresh intervals, and other settings.
 *
 * This class ensures that configuration changes take effect immediately without
 * requiring an extension reload.
 */
export class ConfigChangeHandler {
  private disposable: vscode.Disposable;
  private jiraClient?: JiraClient;
  private treeViewRefreshCallback?: () => void;
  private autoRefreshUpdateCallback?: () => void;

  /**
   * Creates a new ConfigChangeHandler
   *
   * @param configManager - The configuration manager instance
   * @param authManager - The authentication manager instance
   * @param outputChannel - Output channel for logging
   */
  constructor(
    private configManager: ConfigManager,
    private authManager: AuthManager,
    private outputChannel: vscode.OutputChannel
  ) {
    // Register configuration change listener
    this.disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('jiraExtension')) {
        this.handleConfigChange(event).catch((error) => {
          this.outputChannel.appendLine(`Configuration change handler error: ${error}`);
          vscode.window.showErrorMessage(
            `Failed to apply configuration changes: ${error.message}`
          );
        });
      }
    });

    this.outputChannel.appendLine('Configuration change handler registered');
  }

  /**
   * Set the JiraClient instance
   *
   * This allows the handler to reinitialize the client when instance URL changes.
   *
   * @param client - The JiraClient instance
   */
  setJiraClient(client: JiraClient | undefined): void {
    this.jiraClient = client;
  }

  /**
   * Set the tree view refresh callback
   *
   * This callback is called when configuration changes require a tree view refresh
   * (e.g., project key change, max issues change).
   *
   * @param callback - Function to call to refresh the tree view
   */
  setTreeViewRefreshCallback(callback: () => void): void {
    this.treeViewRefreshCallback = callback;
  }

  /**
   * Set the auto-refresh update callback
   *
   * This callback is called when the auto-refresh interval changes.
   *
   * @param callback - Function to call to update the auto-refresh interval
   */
  setAutoRefreshUpdateCallback(callback: () => void): void {
    this.autoRefreshUpdateCallback = callback;
  }

  /**
   * Handle configuration change events
   *
   * Routes configuration changes to appropriate handlers based on which
   * settings were modified.
   *
   * @param event - The configuration change event
   */
  private async handleConfigChange(event: vscode.ConfigurationChangeEvent): Promise<void> {
    this.outputChannel.appendLine('Configuration changed, processing updates...');

    // Refresh config to get latest values
    this.configManager.refresh();

    // Track which changes were processed
    const changes: string[] = [];

    // Handle instance URL changes
    if (event.affectsConfiguration('jiraExtension.instanceUrl')) {
      await this.handleInstanceUrlChange();
      changes.push('instance URL');
    }

    // Handle auto-refresh interval changes
    if (event.affectsConfiguration('jiraExtension.autoRefreshInterval')) {
      this.handleAutoRefreshIntervalChange();
      changes.push('auto-refresh interval');
    }

    // Handle changes that require tree view refresh
    if (
      event.affectsConfiguration('jiraExtension.projectKey') ||
      event.affectsConfiguration('jiraExtension.maxIssues') ||
      event.affectsConfiguration('jiraExtension.featureEpics')
    ) {
      this.handleTreeViewRefreshChange(event);
      if (event.affectsConfiguration('jiraExtension.projectKey')) {
        changes.push('project key');
      }
      if (event.affectsConfiguration('jiraExtension.maxIssues')) {
        changes.push('max issues');
      }
      if (event.affectsConfiguration('jiraExtension.featureEpics')) {
        changes.push('feature epics');
      }
    }

    // Handle context file location changes
    if (event.affectsConfiguration('jiraExtension.contextFileLocation')) {
      changes.push('context file location');
    }

    // Handle Copilot tools toggle
    if (event.affectsConfiguration('jiraExtension.enableCopilotTools')) {
      changes.push('Copilot tools setting');
    }

    // Log summary of changes
    if (changes.length > 0) {
      this.outputChannel.appendLine(`Applied configuration changes: ${changes.join(', ')}`);
    } else {
      this.outputChannel.appendLine('Configuration changed, but no handlers were triggered');
    }
  }

  /**
   * Handle instance URL changes
   *
   * When the instance URL changes, we need to:
   * 1. Clear cached data (old instance data is invalid)
   * 2. Reinitialize the API client with the new URL
   * 3. Revalidate credentials
   * 4. Refresh the tree view
   */
  private async handleInstanceUrlChange(): Promise<void> {
    this.outputChannel.appendLine('Instance URL changed, reinitializing...');

    const newUrl = this.configManager.instanceUrl;
    this.outputChannel.appendLine(`New instance URL: ${newUrl || '(empty)'}`);

    // If there's a JiraClient instance, we need to recreate it
    // Note: In the current implementation, JiraClient is created on-demand
    // so we don't need to do anything special here. The next API call
    // will use the new URL automatically.

    // Clear any cached data since it's from the old instance
    // This will be implemented when we have cache management
    this.outputChannel.appendLine('Note: Cache clearing will be implemented with cache management');

    // Refresh tree view if callback is set
    if (this.treeViewRefreshCallback) {
      this.treeViewRefreshCallback();
      this.outputChannel.appendLine('Tree view refresh triggered');
    }

    // Show notification to user
    if (newUrl) {
      vscode.window.showInformationMessage(
        `Jira instance URL updated to: ${newUrl}`,
        'Test Connection'
      ).then(selection => {
        if (selection === 'Test Connection') {
          vscode.commands.executeCommand('jira.validate');
        }
      });
    }
  }

  /**
   * Handle auto-refresh interval changes
   *
   * When the auto-refresh interval changes, we need to update any active
   * refresh timers with the new interval.
   */
  private handleAutoRefreshIntervalChange(): void {
    const newInterval = this.configManager.autoRefreshInterval;
    this.outputChannel.appendLine(`Auto-refresh interval changed to: ${newInterval} seconds`);

    // Call the auto-refresh update callback if set
    if (this.autoRefreshUpdateCallback) {
      this.autoRefreshUpdateCallback();
      this.outputChannel.appendLine('Auto-refresh timer updated');
    }

    // Show notification to user
    if (newInterval === 0) {
      vscode.window.showInformationMessage('Auto-refresh has been disabled');
    } else {
      vscode.window.showInformationMessage(
        `Auto-refresh interval updated to ${newInterval} seconds`
      );
    }
  }

  /**
   * Handle changes that require tree view refresh
   *
   * When certain settings change (project key, max issues, feature epics),
   * we need to refresh the tree view to reflect the new settings.
   *
   * @param event - The configuration change event
   */
  private handleTreeViewRefreshChange(event: vscode.ConfigurationChangeEvent): void {
    const changedSettings: string[] = [];

    if (event.affectsConfiguration('jiraExtension.projectKey')) {
      const newProjectKey = this.configManager.projectKey;
      this.outputChannel.appendLine(`Project key changed to: ${newProjectKey || '(empty)'}`);
      changedSettings.push('project key');
    }

    if (event.affectsConfiguration('jiraExtension.maxIssues')) {
      const newMaxIssues = this.configManager.maxIssues;
      this.outputChannel.appendLine(`Max issues changed to: ${newMaxIssues}`);
      changedSettings.push('max issues');
    }

    if (event.affectsConfiguration('jiraExtension.featureEpics')) {
      const newEpics = this.configManager.featureEpics;
      this.outputChannel.appendLine(
        `Feature epics changed to: ${newEpics.length > 0 ? newEpics.join(', ') : '(none)'}`
      );
      changedSettings.push('feature epics');
    }

    // Refresh tree view if callback is set
    if (this.treeViewRefreshCallback) {
      this.treeViewRefreshCallback();
      this.outputChannel.appendLine('Tree view refresh triggered');
    }

    // Show notification if multiple settings changed
    if (changedSettings.length > 0) {
      const message = `Configuration updated: ${changedSettings.join(', ')}. Tree view will refresh.`;
      vscode.window.showInformationMessage(message);
    }
  }

  /**
   * Dispose the configuration change handler
   *
   * Unregisters the configuration change listener and cleans up resources.
   */
  dispose(): void {
    this.disposable.dispose();
    this.outputChannel.appendLine('Configuration change handler disposed');
  }
}
