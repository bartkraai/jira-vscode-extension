import * as vscode from 'vscode';

/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 */
export function activate(context: vscode.ExtensionContext) {
	// Create output channel for logging
	const outputChannel = vscode.window.createOutputChannel('Jira Extension');
	outputChannel.appendLine('Jira Extension is now active');

	console.log('Jira Extension is now active');

	// Register the configure command
	const configureCommand = vscode.commands.registerCommand('jira.configure', async () => {
		vscode.window.showInformationMessage('Jira configuration wizard will be implemented in the next feature.');
	});

	// Add disposables to context subscriptions for cleanup
	context.subscriptions.push(configureCommand);
	context.subscriptions.push(outputChannel);
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {
	console.log('Jira Extension has been deactivated');
}
