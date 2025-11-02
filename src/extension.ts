import * as vscode from 'vscode';
import { AuthManager } from './api/AuthManager';
import { registerAuthenticateCommand, registerClearCredentialsCommand } from './commands/authenticate';
import { registerCacheClearCommand, registerCacheStatsCommand } from './commands/cache';

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
	const outputChannel = vscode.window.createOutputChannel('Jira Extension');
	outputChannel.appendLine('Jira Extension is now active');
	outputChannel.appendLine(`Extension ID: ${context.extension.id}`);
	outputChannel.appendLine(`Extension Path: ${context.extensionPath}`);

	console.log('Jira Extension is now active');

	// Initialize AuthManager
	const authManager = new AuthManager(context);

	// Register authentication commands
	context.subscriptions.push(registerAuthenticateCommand(context, authManager));
	context.subscriptions.push(registerClearCredentialsCommand(context, authManager));

	// Register cache commands (no JiraClient yet, will show helpful message)
	context.subscriptions.push(registerCacheClearCommand(context));
	context.subscriptions.push(registerCacheStatsCommand(context));

	// Register the configure command (placeholder for future feature)
	const configureCommand = vscode.commands.registerCommand('jira.configure', async () => {
		// For now, direct users to authenticate command
		vscode.window.showInformationMessage(
			'Please use "Jira: Authenticate" command to set up your credentials.',
			'Authenticate Now'
		).then(selection => {
			if (selection === 'Authenticate Now') {
				vscode.commands.executeCommand('jira.authenticate');
			}
		});
	});

	// Add disposables to context subscriptions for cleanup
	context.subscriptions.push(configureCommand);
	context.subscriptions.push(outputChannel);
}

/**
 * This method is called when your extension is deactivated
 * Cleanup resources and clear global state
 */
export function deactivate() {
	console.log('Jira Extension has been deactivated');

	// Clear global context
	extensionContext = undefined;

	// Note: Disposables in context.subscriptions are automatically cleaned up by VS Code
	// This includes the output channel, commands, and any other registered providers
}
