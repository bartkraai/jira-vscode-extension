import * as vscode from 'vscode';
import { IssueItem } from '../providers/JiraTreeProvider';

/**
 * Register the "Investigate with Copilot" command
 *
 * This command allows users to investigate a Jira issue with GitHub Copilot
 * by fetching full issue details and generating a context file that Copilot
 * can use to provide better assistance.
 *
 * @param context - VS Code extension context
 * @returns Disposable for the command
 */
export function registerInvestigateWithCopilotCommand(
	context: vscode.ExtensionContext
): vscode.Disposable {
	return vscode.commands.registerCommand(
		'jira.investigateWithCopilot',
		async (item: IssueItem) => {
			try {
				if (!item || !item.issue) {
					vscode.window.showErrorMessage('No issue selected for investigation.');
					return;
				}

				const issueKey = item.issue.key;

				// Show progress notification
				await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: `Investigating ${issueKey} with Copilot...`,
						cancellable: false
					},
					async () => {
						// TODO: Feature 7.2 - Fetch full issue details
						// TODO: Feature 7.3 - Generate markdown file
						// TODO: Feature 7.4 - Save context file
						// TODO: Feature 7.5 - Open file in editor for Copilot context

						// Placeholder: Show information message
						vscode.window.showInformationMessage(
							`Investigation feature for ${issueKey} is coming soon! This will fetch full issue details and generate a context file for Copilot.`
						);
					}
				);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to investigate issue: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}
	);
}
