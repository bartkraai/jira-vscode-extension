import * as vscode from 'vscode';
import { AuthManager } from './api/AuthManager';
import { ConfigManager } from './config/ConfigManager';
import { ConfigValidator } from './config/ConfigValidator';
import { ConfigChangeHandler } from './config/ConfigChangeHandler';
import { registerAuthenticateCommand, registerClearCredentialsCommand } from './commands/authenticate';
import { registerCacheClearCommand, registerCacheStatsCommand } from './commands/cache';
import { registerConfigureCommand } from './commands/configure';
import { registerValidateCommand } from './commands/validate';

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
	const configValidator = new ConfigValidator(configManager, authManager);
	const configChangeHandler = new ConfigChangeHandler(configManager, authManager, outputChannel);

	// Register authentication commands
	context.subscriptions.push(registerAuthenticateCommand(context, authManager));
	context.subscriptions.push(registerClearCredentialsCommand(context, authManager));

	// Register configuration command (setup wizard)
	context.subscriptions.push(registerConfigureCommand(context, authManager, configManager));

	// Register validation command
	context.subscriptions.push(registerValidateCommand(context, configValidator, outputChannel));

	// Register cache commands (no JiraClient yet, will show helpful message)
	context.subscriptions.push(registerCacheClearCommand(context));
	context.subscriptions.push(registerCacheStatsCommand(context));

	// Register configuration change handler
	// Note: The handler will be fully utilized once tree views and JiraClient are implemented
	// For now, it logs changes and prepares for future integration
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
				'Jira Extension configuration has issues. Check the output channel for details.',
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
	console.log('Jira Extension has been deactivated');

	// Clear global context
	extensionContext = undefined;

	// Note: Disposables in context.subscriptions are automatically cleaned up by VS Code
	// This includes the output channel, commands, and any other registered providers
}
