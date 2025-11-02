import * as vscode from 'vscode';
import { AuthManager } from './api/AuthManager';
import { ConfigManager } from './config/ConfigManager';
import { registerAuthenticateCommand, registerClearCredentialsCommand } from './commands/authenticate';
import { registerCacheClearCommand, registerCacheStatsCommand } from './commands/cache';
import { registerConfigureCommand } from './commands/configure';

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

	// Initialize managers
	const authManager = new AuthManager(context);
	const configManager = new ConfigManager();

	// Register authentication commands
	context.subscriptions.push(registerAuthenticateCommand(context, authManager));
	context.subscriptions.push(registerClearCredentialsCommand(context, authManager));

	// Register configuration command (setup wizard)
	context.subscriptions.push(registerConfigureCommand(context, authManager, configManager));

	// Register cache commands (no JiraClient yet, will show helpful message)
	context.subscriptions.push(registerCacheClearCommand(context));
	context.subscriptions.push(registerCacheStatsCommand(context));
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
