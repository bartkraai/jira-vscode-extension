import * as vscode from 'vscode';
import { AuthManager } from './api/AuthManager';
import { CacheManager } from './api/CacheManager';
import { ConfigManager } from './config/ConfigManager';
import { ConfigValidator } from './config/ConfigValidator';
import { ConfigChangeHandler } from './config/ConfigChangeHandler';
import { JiraTreeProvider } from './providers/JiraTreeProvider';
import { CreateIssueWebviewProvider } from './providers/CreateIssueWebviewProvider';
import { IssueDetailsWebviewProvider } from './providers/IssueDetailsWebviewProvider';
import { registerAuthenticateCommand, registerClearCredentialsCommand } from './commands/authenticate';
import { registerCacheClearCommand, registerCacheStatsCommand } from './commands/cache';
import { registerConfigureCommand } from './commands/configure';
import { registerValidateCommand } from './commands/validate';
import { registerRefreshCommand, registerOpenIssueCommand, registerCopyIssueKeyCommand, registerFilterByIssueTypeCommand, registerFilterByPriorityCommand, registerFilterBySprintCommand, registerClearFiltersCommand, registerSearchIssuesCommand, registerClearSearchCommand, registerChangeStatusCommand, registerAddCommentCommand, registerShowCreateMenuCommand } from './commands/treeView';
import { registerInvestigateWithCopilotCommand, registerInvestigateTicketCommand } from './commands/copilot';
import { JiraClient } from './api/JiraClient';
import { DummyJiraClient } from './api/DummyJiraClient';
import { GetIssueInfoTool } from './tools/GetIssueInfoTool';
import { AddCommentTool } from './tools/AddCommentTool';
import { UpdateStatusTool } from './tools/UpdateStatusTool';
import { LinkPRTool } from './tools/LinkPRTool';
import { CreateSubtaskTool } from './tools/CreateSubtaskTool';
import { LogTimeTool } from './tools/LogTimeTool';

/**
 * Global extension context - accessible to all modules
 * This is set during activation and used by other modules to access
 * VS Code APIs like secret storage, workspace state, etc.
 */
let extensionContext: vscode.ExtensionContext | undefined;

/**
 * Get the global extension context
 * @returns The extension context if activated, undefined otherwise
 */
export function getExtensionContext(): vscode.ExtensionContext | undefined {
	return extensionContext;
}

/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 */
export function activate(context: vscode.ExtensionContext) {
	// Store context globally for access by other modules
	extensionContext = context;

	// Create output channel for logging
	const outputChannel = vscode.window.createOutputChannel('42-Jira-Buddy');
	outputChannel.appendLine('42-Jira-Buddy is now active');
	outputChannel.appendLine(`Extension ID: ${context.extension.id}`);
	outputChannel.appendLine(`Extension Path: ${context.extensionPath}`);

	console.log('42-Jira-Buddy is now active');

	// Initialize managers
	const authManager = new AuthManager(context);
	const configManager = new ConfigManager();
	const cacheManager = new CacheManager();
	const configValidator = new ConfigValidator(configManager, authManager);
	const configChangeHandler = new ConfigChangeHandler(configManager, authManager, outputChannel);

	// Initialize Tree View Provider
	const treeProvider = new JiraTreeProvider(context, authManager, configManager, cacheManager);
	const treeView = vscode.window.createTreeView('jiraMyWork', {
		treeDataProvider: treeProvider,
		showCollapseAll: true
	});
	context.subscriptions.push(treeView);

	// Start auto-refresh if configured
	treeProvider.startAutoRefresh();

	// Add cleanup for auto-refresh timer
	context.subscriptions.push({
		dispose: () => {
			treeProvider.stopAutoRefresh();
		}
	});

	// Register authentication commands
	context.subscriptions.push(registerAuthenticateCommand(context, authManager));
	context.subscriptions.push(registerClearCredentialsCommand(context, authManager));

	// Register configuration command (setup wizard)
	context.subscriptions.push(registerConfigureCommand(context, authManager, configManager));

	// Register validation command
	context.subscriptions.push(registerValidateCommand(context, configValidator, outputChannel));

	// Register cache commands
	context.subscriptions.push(registerCacheClearCommand(context));
	context.subscriptions.push(registerCacheStatsCommand(context));

	// Register tree view commands
	context.subscriptions.push(registerRefreshCommand(context, treeProvider, cacheManager));
	context.subscriptions.push(registerOpenIssueCommand(context, configManager));
	context.subscriptions.push(registerCopyIssueKeyCommand(context));
	context.subscriptions.push(registerFilterByIssueTypeCommand(context, treeProvider));
	context.subscriptions.push(registerFilterByPriorityCommand(context, treeProvider));
	context.subscriptions.push(registerFilterBySprintCommand(context, treeProvider));
	context.subscriptions.push(registerClearFiltersCommand(context, treeProvider));
	context.subscriptions.push(registerSearchIssuesCommand(context, treeProvider));
	context.subscriptions.push(registerClearSearchCommand(context, treeProvider));
	context.subscriptions.push(registerChangeStatusCommand(context, authManager, cacheManager, treeProvider));
	context.subscriptions.push(registerAddCommentCommand(context, authManager, cacheManager));
	context.subscriptions.push(registerShowCreateMenuCommand(context));

	// Register Copilot integration commands
	context.subscriptions.push(registerInvestigateWithCopilotCommand(context, authManager, configManager, cacheManager));
	context.subscriptions.push(registerInvestigateTicketCommand(context, authManager, configManager, cacheManager));

	// Register Language Model Tools (Features 8.1-8.6)
	// Only register if Copilot tools are enabled in configuration
	if (configManager.enableCopilotTools) {
		try {
			// Feature 8.1: Get Issue Info Tool (Proof of Concept)
			const getIssueInfoTool = new GetIssueInfoTool(context, authManager, cacheManager);
			context.subscriptions.push(
				vscode.lm.registerTool('jira_get_issue_info', getIssueInfoTool)
			);
			outputChannel.appendLine('Language Model Tool registered: jira_get_issue_info');

			// Feature 8.3: Add Comment Tool
			const addCommentTool = new AddCommentTool(context, authManager, cacheManager);
			context.subscriptions.push(
				vscode.lm.registerTool('jira_add_comment', addCommentTool)
			);
			outputChannel.appendLine('Language Model Tool registered: jira_add_comment');

			// Feature 8.4: Update Status Tool
			const updateStatusTool = new UpdateStatusTool(context, authManager, cacheManager, configManager);
			context.subscriptions.push(
				vscode.lm.registerTool('jira_update_status', updateStatusTool)
			);
			outputChannel.appendLine('Language Model Tool registered: jira_update_status');

			// Feature 8.5: Link PR Tool
			const linkPRTool = new LinkPRTool(context, authManager, cacheManager);
			context.subscriptions.push(
				vscode.lm.registerTool('jira_link_pr', linkPRTool)
			);
			outputChannel.appendLine('Language Model Tool registered: jira_link_pr');

			// Feature 8.6: Create Subtask Tool
			const createSubtaskTool = new CreateSubtaskTool(context, authManager, cacheManager);
			context.subscriptions.push(
				vscode.lm.registerTool('jira_create_subtask', createSubtaskTool)
			);
			outputChannel.appendLine('Language Model Tool registered: jira_create_subtask');

			// Feature 8.7: Log Time Tool
			const logTimeTool = new LogTimeTool(context, authManager, cacheManager, configManager);
			context.subscriptions.push(
				vscode.lm.registerTool('jira_log_time', logTimeTool)
			);
			outputChannel.appendLine('Language Model Tool registered: jira_log_time');
		} catch (error) {
			outputChannel.appendLine(`Failed to register Language Model Tools: ${error}`);
			// Don't fail extension activation if tool registration fails
		}
	}

	// Register toggle dummy data command
	context.subscriptions.push(
		vscode.commands.registerCommand('jira.toggleDummyData', async () => {
			const currentValue = configManager.useDummyData;
			const newValue = !currentValue;

			await configManager.setUseDummyData(newValue, false);

			const status = newValue ? 'enabled' : 'disabled';
			const message = `Dummy data mode ${status}. Please reload the extension for changes to take effect.`;

			const selection = await vscode.window.showInformationMessage(
				message,
				'Reload Extension',
				'Dismiss'
			);

			if (selection === 'Reload Extension') {
				vscode.commands.executeCommand('workbench.action.reloadWindow');
			}
		})
	);

	// Register show issue details command (for dummy data mode)
	let issueDetailsProvider: IssueDetailsWebviewProvider | null = null;
	context.subscriptions.push(
		vscode.commands.registerCommand('jira.showIssueDetails', async (issueKey: string) => {
			try {
				// Create client based on dummy data mode
				let client;
				if (configManager.useDummyData) {
					client = new DummyJiraClient(undefined, undefined, undefined, cacheManager);
				} else {
					const credentials = await authManager.getCredentials();
					if (!credentials) {
						vscode.window.showErrorMessage('Please configure Jira credentials first.');
						return;
					}
					client = new JiraClient(credentials.url, credentials.email, credentials.token, cacheManager);
				}

				// Create or reuse provider
				if (!issueDetailsProvider) {
					issueDetailsProvider = new IssueDetailsWebviewProvider(context, client);
				}

				await issueDetailsProvider.show(issueKey);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to show issue details: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		})
	);

	// Register ticket creation commands
	// Create webview provider (will be initialized on demand with JiraClient)
	let webviewProvider: CreateIssueWebviewProvider | null = null;

	const getOrCreateWebviewProvider = async (): Promise<CreateIssueWebviewProvider | null> => {
		// Create or reuse webview provider
		if (!webviewProvider) {
			// Check if dummy data mode is enabled
			if (configManager.useDummyData) {
				// Use dummy client for testing without credentials
				const dummyClient = new DummyJiraClient(undefined, undefined, undefined, cacheManager);
				webviewProvider = new CreateIssueWebviewProvider(context, dummyClient, configManager);
			} else {
				// Get credentials to create real JiraClient
				const credentials = await authManager.getCredentials();
				if (!credentials) {
					vscode.window.showErrorMessage(
						'Please configure Jira credentials first using "Jira: Configure" command.'
					);
					return null;
				}

				const jiraClient = new JiraClient(
					credentials.url,
					credentials.email,
					credentials.token,
					cacheManager
				);
				webviewProvider = new CreateIssueWebviewProvider(context, jiraClient, configManager);
			}
		}

		return webviewProvider;
	};

	// Register "Create Bug Against Feature" command
	context.subscriptions.push(
		vscode.commands.registerCommand('jira.createBug', async () => {
			const provider = await getOrCreateWebviewProvider();
			if (provider) {
				await provider.show('bugAgainstFeature', 'Bug');
			}
		})
	);

	// Register "Create Internal Defect" command
	context.subscriptions.push(
		vscode.commands.registerCommand('jira.createDefect', async () => {
			const provider = await getOrCreateWebviewProvider();
			if (provider) {
				await provider.show('internalDefect', 'Bug');
			}
		})
	);

	// Register "Create Story" command
	context.subscriptions.push(
		vscode.commands.registerCommand('jira.createStory', async () => {
			const provider = await getOrCreateWebviewProvider();
			if (provider) {
				await provider.show('story', 'Story');
			}
		})
	);

	// Register "Create Task" command
	context.subscriptions.push(
		vscode.commands.registerCommand('jira.createTask', async () => {
			const provider = await getOrCreateWebviewProvider();
			if (provider) {
				await provider.show('task', 'Task');
			}
		})
	);

	// Register configuration change handler and set callbacks
	configChangeHandler.setTreeViewRefreshCallback(() => treeProvider.refresh());
	configChangeHandler.setAutoRefreshUpdateCallback(() => treeProvider.updateRefreshInterval());
	context.subscriptions.push(configChangeHandler);
	context.subscriptions.push(outputChannel);

	// Validate configuration on activation
	// Run asynchronously to not block activation
	validateOnActivation(configValidator, outputChannel).catch(error => {
		outputChannel.appendLine(`Configuration validation failed: ${error}`);
	});
}

/**
 * Validate configuration on extension activation
 *
 * Runs validation asynchronously after extension activates.
 * Logs results to output channel but does not show notifications
 * unless there are critical errors.
 *
 * @param validator - The ConfigValidator instance
 * @param outputChannel - Output channel for logging
 */
async function validateOnActivation(
	validator: ConfigValidator,
	outputChannel: vscode.OutputChannel
): Promise<void> {
	outputChannel.appendLine('Running configuration validation...');

	const result = await validator.validate();

	outputChannel.appendLine('=== Configuration Validation Results ===');
	outputChannel.appendLine(`Valid: ${result.valid}`);

	if (result.errors.length > 0) {
		outputChannel.appendLine('\nErrors:');
		result.errors.forEach(error => outputChannel.appendLine(`  - ${error}`));

		// Only show notification for critical errors (not missing credentials)
		const hasCriticalError = result.errors.some(
			error => !error.includes('No credentials configured')
		);

		if (hasCriticalError) {
			vscode.window.showWarningMessage(
				'42-Jira-Buddy configuration has issues. Check the output channel for details.',
				'View Output',
				'Run Setup'
			).then(selection => {
				if (selection === 'View Output') {
					outputChannel.show();
				} else if (selection === 'Run Setup') {
					vscode.commands.executeCommand('jira.configure');
				}
			});
		}
	}

	if (result.warnings.length > 0) {
		outputChannel.appendLine('\nWarnings:');
		result.warnings.forEach(warning => outputChannel.appendLine(`  - ${warning}`));
	}

	if (result.valid && result.errors.length === 0) {
		outputChannel.appendLine('\nConfiguration is valid and connection is working!');
	}

	outputChannel.appendLine('========================================');
}

/**
 * This method is called when your extension is deactivated
 * Cleanup resources and clear global state
 */
export function deactivate() {
	console.log('42-Jira-Buddy has been deactivated');

	// Clear global context
	extensionContext = undefined;

	// Note: Disposables in context.subscriptions are automatically cleaned up by VS Code
	// This includes the output channel, commands, and any other registered providers
}
