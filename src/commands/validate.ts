import * as vscode from 'vscode';
import { ConfigValidator } from '../config/ConfigValidator';

/**
 * Register validate configuration command
 *
 * Allows users to manually validate their configuration and test
 * the connection to Jira. Shows detailed results including errors
 * and warnings.
 *
 * @param context - Extension context
 * @param validator - ConfigValidator instance
 * @param outputChannel - Output channel for logging
 * @returns Disposable for the command
 */
export function registerValidateCommand(
  context: vscode.ExtensionContext,
  validator: ConfigValidator,
  outputChannel: vscode.OutputChannel
): vscode.Disposable {
  return vscode.commands.registerCommand('jira.validateConfig', async () => {
    try {
      // Show progress indicator while validating
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Validating Jira configuration...',
          cancellable: false
        },
        async (progress) => {
          progress.report({ increment: 0, message: 'Checking configuration values...' });

          // Run validation
          const result = await validator.validate();

          progress.report({ increment: 50, message: 'Testing API connection...' });

          // Log results to output channel
          outputChannel.appendLine('=== Configuration Validation Results ===');
          outputChannel.appendLine(`Valid: ${result.valid}`);
          outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);

          if (result.errors.length > 0) {
            outputChannel.appendLine('\nErrors:');
            result.errors.forEach(error => outputChannel.appendLine(`  - ${error}`));
          }

          if (result.warnings.length > 0) {
            outputChannel.appendLine('\nWarnings:');
            result.warnings.forEach(warning => outputChannel.appendLine(`  - ${warning}`));
          }

          if (result.valid && result.errors.length === 0) {
            outputChannel.appendLine('\nConfiguration is valid and connection is working!');
          }

          outputChannel.appendLine('========================================\n');

          progress.report({ increment: 100, message: 'Validation complete' });

          // Show notifications to user
          if (result.errors.length > 0) {
            const action = await vscode.window.showErrorMessage(
              `Configuration validation failed: ${result.errors[0]}`,
              'View Details',
              'Open Settings',
              'Run Setup Wizard'
            );

            if (action === 'View Details') {
              outputChannel.show();
            } else if (action === 'Open Settings') {
              vscode.commands.executeCommand('workbench.action.openSettings', '@ext:jiraExtension');
            } else if (action === 'Run Setup Wizard') {
              vscode.commands.executeCommand('jira.configure');
            }
          } else if (result.warnings.length > 0) {
            const action = await vscode.window.showWarningMessage(
              `Configuration is valid but has warnings: ${result.warnings[0]}`,
              'View Details',
              'Dismiss'
            );

            if (action === 'View Details') {
              outputChannel.show();
            }
          } else {
            const action = await vscode.window.showInformationMessage(
              'Configuration is valid and connection to Jira is working!',
              'View Details'
            );

            if (action === 'View Details') {
              outputChannel.show();
            }
          }
        }
      );
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`Validation error: ${errorMessage}`);
      vscode.window.showErrorMessage(
        `Failed to validate configuration: ${errorMessage}`
      );
    }
  });
}
