import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';

/**
 * Register cache clear command
 *
 * Allows users to manually clear the API response cache.
 * Useful when users want to force a refresh of all data.
 *
 * @param context - Extension context
 * @param jiraClient - Optional JiraClient instance (if available)
 * @returns Disposable for the command
 */
export function registerCacheClearCommand(
  context: vscode.ExtensionContext,
  jiraClient?: JiraClient
): vscode.Disposable {
  return vscode.commands.registerCommand('jira.clearCache', async () => {
    try {
      // If we have a JiraClient instance, use its cache
      if (jiraClient) {
        const cache = jiraClient.getCache();
        const stats = cache.getStats();

        // Show confirmation dialog
        const confirmed = await vscode.window.showWarningMessage(
          `Clear cache? This will remove ${stats.totalEntries} cached entries.`,
          { modal: true },
          'Clear Cache'
        );

        if (confirmed === 'Clear Cache') {
          const clearedCount = cache.clear();
          vscode.window.showInformationMessage(
            `Cache cleared successfully! Removed ${clearedCount} entries.`
          );
        }
      } else {
        // No JiraClient available yet
        vscode.window.showInformationMessage(
          'Cache is empty. Please authenticate first using "Jira: Authenticate".'
        );
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(
        `Failed to clear cache: ${error.message}`
      );
    }
  });
}

/**
 * Register cache stats command
 *
 * Shows current cache statistics to help users understand cache usage.
 *
 * @param context - Extension context
 * @param jiraClient - Optional JiraClient instance (if available)
 * @returns Disposable for the command
 */
export function registerCacheStatsCommand(
  context: vscode.ExtensionContext,
  jiraClient?: JiraClient
): vscode.Disposable {
  return vscode.commands.registerCommand('jira.cacheStats', async () => {
    try {
      if (jiraClient) {
        const cache = jiraClient.getCache();
        const stats = cache.getStats();

        // Create a formatted message with cache statistics
        const message = `
**Jira Cache Statistics**

Total Entries: ${stats.totalEntries}
Valid Entries: ${stats.validEntries}
Expired Entries: ${stats.expiredEntries}

**Cached Keys:**
${stats.keys.length > 0 ? stats.keys.map(k => `- ${k}`).join('\n') : 'No cached entries'}
        `.trim();

        // Show in a new editor document
        const doc = await vscode.workspace.openTextDocument({
          content: message,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, {
          preview: true,
          preserveFocus: false
        });
      } else {
        vscode.window.showInformationMessage(
          'Cache is empty. Please authenticate first using "Jira: Authenticate".'
        );
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(
        `Failed to get cache stats: ${error.message}`
      );
    }
  });
}
