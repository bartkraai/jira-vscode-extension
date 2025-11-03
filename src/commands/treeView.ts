import * as vscode from 'vscode';
import { JiraTreeProvider, IssueItem } from '../providers/JiraTreeProvider';
import { JiraIssue } from '../models/jira';
import { ConfigManager } from '../config/ConfigManager';
import { CacheManager } from '../api/CacheManager';
import { AuthManager } from '../api/AuthManager';
import { JiraClient } from '../api/JiraClient';

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
 * Register the open issue command
 *
 * Opens a Jira issue in the default browser.
 * This command can be triggered from the tree view context menu or
 * by clicking on an issue in the tree.
 *
 * @param context - VS Code extension context
 * @param configManager - Configuration manager instance
 * @returns Disposable for the command
 */
export function registerOpenIssueCommand(
	context: vscode.ExtensionContext,
	configManager: ConfigManager
): vscode.Disposable {
	return vscode.commands.registerCommand('jira.openIssue', async (issueKey: string) => {
		try {
			const instanceUrl = configManager.instanceUrl;

			if (!instanceUrl) {
				vscode.window.showErrorMessage('Jira instance URL not configured. Run "Jira: Configure" first.');
				return;
			}

			// Construct the issue URL
			const issueUrl = `${instanceUrl}/browse/${issueKey}`;

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

/**
 * Register the copy issue key command
 *
 * Copies a Jira issue key to the clipboard.
 * This command is triggered from the tree view context menu.
 *
 * @param context - VS Code extension context
 * @returns Disposable for the command
 */
export function registerCopyIssueKeyCommand(
	context: vscode.ExtensionContext
): vscode.Disposable {
	return vscode.commands.registerCommand('jira.copyIssueKey', async (item: IssueItem) => {
		try {
			// Copy the issue key to the clipboard
			await vscode.env.clipboard.writeText(item.issue.key);

			// Show success notification
			vscode.window.showInformationMessage(`Copied ${item.issue.key} to clipboard`);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to copy issue key: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});
}

/**
 * Register the filter by issue type command
 *
 * Shows a quick pick to filter issues by their type (Bug, Story, Task, etc.).
 * Users can select multiple types or clear the filter.
 *
 * @param context - VS Code extension context
 * @param treeProvider - The Jira tree provider instance
 * @returns Disposable for the command
 */
export function registerFilterByIssueTypeCommand(
	context: vscode.ExtensionContext,
	treeProvider: JiraTreeProvider
): vscode.Disposable {
	return vscode.commands.registerCommand('jira.filterByIssueType', async () => {
		try {
			await treeProvider.filterByIssueType();
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to apply filter: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});
}

/**
 * Register the filter by priority command
 *
 * Shows a quick pick to filter issues by their priority (Highest, High, Medium, Low, Lowest).
 * Users can select multiple priorities or clear the filter.
 *
 * @param context - VS Code extension context
 * @param treeProvider - The Jira tree provider instance
 * @returns Disposable for the command
 */
export function registerFilterByPriorityCommand(
	context: vscode.ExtensionContext,
	treeProvider: JiraTreeProvider
): vscode.Disposable {
	return vscode.commands.registerCommand('jira.filterByPriority', async () => {
		try {
			await treeProvider.filterByPriority();
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to apply filter: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});
}

/**
 * Register the filter by sprint command
 *
 * Shows a quick pick to filter issues by their sprint.
 * Users can select multiple sprints or show issues without a sprint.
 *
 * @param context - VS Code extension context
 * @param treeProvider - The Jira tree provider instance
 * @returns Disposable for the command
 */
export function registerFilterBySprintCommand(
	context: vscode.ExtensionContext,
	treeProvider: JiraTreeProvider
): vscode.Disposable {
	return vscode.commands.registerCommand('jira.filterBySprint', async () => {
		try {
			await treeProvider.filterBySprint();
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to apply filter: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});
}

/**
 * Register the clear filters command
 *
 * Clears all active filters (issue type, priority, sprint, search) and
 * refreshes the tree view to show all issues.
 *
 * @param context - VS Code extension context
 * @param treeProvider - The Jira tree provider instance
 * @returns Disposable for the command
 */
export function registerClearFiltersCommand(
	context: vscode.ExtensionContext,
	treeProvider: JiraTreeProvider
): vscode.Disposable {
	return vscode.commands.registerCommand('jira.clearFilters', () => {
		try {
			treeProvider.clearFilters();
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to clear filters: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});
}

/**
 * Register the search issues command
 *
 * Shows an input box for searching issues by key, summary, or description.
 * The search is case-insensitive and filters the tree view in real-time.
 *
 * @param context - VS Code extension context
 * @param treeProvider - The Jira tree provider instance
 * @returns Disposable for the command
 */
export function registerSearchIssuesCommand(
	context: vscode.ExtensionContext,
	treeProvider: JiraTreeProvider
): vscode.Disposable {
	return vscode.commands.registerCommand('jira.searchIssues', async () => {
		try {
			await treeProvider.searchIssues();
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to search issues: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});
}

/**
 * Register the clear search command
 *
 * Clears the search text filter and refreshes the tree view
 * to show all issues (respecting other active filters).
 *
 * @param context - VS Code extension context
 * @param treeProvider - The Jira tree provider instance
 * @returns Disposable for the command
 */
export function registerClearSearchCommand(
	context: vscode.ExtensionContext,
	treeProvider: JiraTreeProvider
): vscode.Disposable {
	return vscode.commands.registerCommand('jira.clearSearch', async () => {
		try {
			await treeProvider.clearSearch();
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to clear search: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});
}

/**
 * Register the change status command
 *
 * Allows users to change the status (transition) of a Jira issue.
 * Fetches available transitions and shows a quick pick for selection.
 *
 * @param context - VS Code extension context
 * @param authManager - Authentication manager instance
 * @param cacheManager - Cache manager instance
 * @param treeProvider - The Jira tree provider instance
 * @returns Disposable for the command
 */
export function registerChangeStatusCommand(
	context: vscode.ExtensionContext,
	authManager: AuthManager,
	cacheManager: CacheManager,
	treeProvider: JiraTreeProvider
): vscode.Disposable {
	return vscode.commands.registerCommand('jira.changeStatus', async (item: IssueItem) => {
		try {
			// Get credentials
			const credentials = await authManager.getCredentials();
			if (!credentials) {
				vscode.window.showErrorMessage('Please configure Jira credentials first');
				return;
			}

			// Create Jira client
			const jiraClient = new JiraClient(
				credentials.url,
				credentials.email,
				credentials.token,
				cacheManager
			);

			// Fetch available transitions
			const transitions = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Fetching available status transitions for ${item.issue.key}...`,
					cancellable: false
				},
				async () => {
					return await jiraClient.getAvailableTransitions(item.issue.key);
				}
			);

			// Check if there are any transitions
			if (transitions.length === 0) {
				vscode.window.showInformationMessage(
					`No status transitions available for ${item.issue.key}`
				);
				return;
			}

			// Create quick pick items from transitions
			const transitionItems = transitions.map(transition => ({
				label: transition.name,
				description: `${item.issue.fields.status.name} → ${transition.to.name}`,
				transition
			}));

			// Show quick pick for status selection
			const selected = await vscode.window.showQuickPick(transitionItems, {
				placeHolder: 'Select new status',
				title: `Change Status for ${item.issue.key}`
			});

			// If user cancelled, exit
			if (!selected) {
				return;
			}

			// Execute the transition
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Updating ${item.issue.key}...`,
					cancellable: false
				},
				async () => {
					await jiraClient.transitionIssue(
						item.issue.key,
						selected.transition.id
					);
				}
			);

			// Refresh tree view to show updated status
			treeProvider.refresh();

			// Show success message
			vscode.window.showInformationMessage(
				`${item.issue.key} moved to ${selected.transition.to.name}`
			);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to change status: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});
}
