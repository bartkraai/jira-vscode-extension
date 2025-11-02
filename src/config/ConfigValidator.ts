import * as vscode from 'vscode';
import { ConfigManager, ConfigValidationResult } from './ConfigManager';
import { AuthManager } from '../api/AuthManager';
import { JiraClient } from '../api/JiraClient';

/**
 * ConfigValidator - Validates configuration and tests API connectivity
 *
 * Provides comprehensive validation of extension configuration including:
 * - Basic configuration value validation
 * - Credential presence checking
 * - API connection testing
 * - Format and constraint validation
 *
 * Used to ensure the extension is properly configured before attempting
 * to make API calls or perform operations.
 */
export class ConfigValidator {
  constructor(
    private configManager: ConfigManager,
    private authManager: AuthManager
  ) {}

  /**
   * Validate the current configuration
   *
   * Performs comprehensive validation including:
   * - Configuration value validation (from ConfigManager)
   * - Credential presence checking
   * - API connection testing (if credentials are available)
   *
   * @returns Promise with ConfigValidationResult containing validation status
   */
  async validate(): Promise<ConfigValidationResult> {
    // Start with basic configuration validation from ConfigManager
    const result = await this.configManager.validate();

    // Check for credentials
    const credentials = await this.authManager.getCredentials();
    if (!credentials) {
      result.valid = false;
      result.errors.push('No credentials configured. Run "Jira: Configure" to set up authentication.');
      // Can't test connection without credentials, so return early
      return result;
    }

    // Test API connection if credentials are available
    try {
      const client = new JiraClient(
        credentials.url,
        credentials.email,
        credentials.token
      );
      await client.testConnection();

      // If we get here, connection is successful
      // Add a note to the result (we could add a 'success' messages array if needed)
    } catch (error) {
      result.valid = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Connection test failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Validate configuration and show results to user
   *
   * Runs validation and displays appropriate notifications based on the results.
   * Shows errors, warnings, and success messages to the user.
   *
   * @param outputChannel - Optional output channel to log detailed results
   * @returns Promise with ConfigValidationResult
   */
  async validateAndNotify(outputChannel?: vscode.OutputChannel): Promise<ConfigValidationResult> {
    const result = await this.validate();

    // Log detailed results to output channel if provided
    if (outputChannel) {
      outputChannel.appendLine('=== Configuration Validation Results ===');
      outputChannel.appendLine(`Valid: ${result.valid}`);

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

      outputChannel.appendLine('========================================');
    }

    // Show notifications to user
    if (result.errors.length > 0) {
      const errorMessage = `Configuration errors:\n${result.errors.join('\n')}`;
      vscode.window.showErrorMessage(
        `Jira Extension configuration is invalid. ${result.errors[0]}`,
        'Open Settings',
        'Run Setup Wizard'
      ).then(selection => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', '@ext:jiraExtension');
        } else if (selection === 'Run Setup Wizard') {
          vscode.commands.executeCommand('jira.configure');
        }
      });
    } else if (result.warnings.length > 0) {
      vscode.window.showWarningMessage(
        `Jira Extension configuration has warnings: ${result.warnings[0]}`,
        'View All Warnings'
      ).then(selection => {
        if (selection === 'View All Warnings' && outputChannel) {
          outputChannel.show();
        }
      });
    } else {
      vscode.window.showInformationMessage(
        'Jira Extension configuration is valid and connection is working!'
      );
    }

    return result;
  }

  /**
   * Quick check if configuration is valid without showing notifications
   *
   * Useful for checking configuration before performing operations.
   * Does not display any UI notifications.
   *
   * @returns Promise with boolean indicating if configuration is valid
   */
  async isValid(): Promise<boolean> {
    const result = await this.validate();
    return result.valid;
  }
}
