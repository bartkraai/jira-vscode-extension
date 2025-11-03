import * as vscode from 'vscode';
import { JiraTreeProvider } from '../providers/JiraTreeProvider';
import { JiraIssue } from '../models/jira';
import { ConfigManager } from '../config/ConfigManager';
import { CacheManager } from '../api/CacheManager';

/**
 * Register the refresh command for the tree view
 *
 * Refreshes the tree view and clears the assigned issues cache to ensure
 * fresh data is fetched from Jira.
 *
 * @param context - VS Code extension context
 * @param treeProvider - The Jira tree provider instance
 * @param cacheManager - The shared cache manager instance
 * @returns Disposable for the command
 */
export function registerRefreshCommand(
	context: vscode.ExtensionContext,
	treeProvider: JiraTreeProvider,
	cacheManager: CacheManager
): vscode.Disposable {
	return vscode.commands.registerCommand('jira.refresh', async () => {
		try {
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Refreshing Jira issues...',
					cancellable: false
				},
				async () => {
					// Clear the assigned issues cache to force a fresh fetch
					const invalidated = cacheManager.invalidate('assignedIssues:*');

					// Trigger tree view refresh
					treeProvider.refresh();
				}
			);
			vscode.window.showInformationMessage('Jira issues refreshed');
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to refresh Jira issues: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});
}

/**
 * Register the open in browser command
 *
 * @param context - VS Code extension context
 * @param configManager - Configuration manager instance
 * @returns Disposable for the command
 */
export function registerOpenInBrowserCommand(
	context: vscode.ExtensionContext,
	configManager: ConfigManager
): vscode.Disposable {
	return vscode.commands.registerCommand('jira.openInBrowser', async (issue: JiraIssue) => {
		try {
			const instanceUrl = configManager.instanceUrl;

			if (!instanceUrl) {
				vscode.window.showErrorMessage('Jira instance URL not configured. Run "Jira: Configure" first.');
				return;
			}

			// Construct the issue URL
			const issueUrl = `${instanceUrl}/browse/${issue.key}`;

			// Open in external browser
			const uri = vscode.Uri.parse(issueUrl);
			await vscode.env.openExternal(uri);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open issue in browser: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});
}
