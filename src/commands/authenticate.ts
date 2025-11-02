import * as vscode from 'vscode';
import { AuthManager } from '../api/AuthManager';
import { JiraCredentials } from '../models/jira';
import { JiraAuthenticationError } from '../api/JiraClient';

/**
 * Register the authentication command
 *
 * This command guides the user through setting up their Jira credentials
 * via a multi-step input flow.
 *
 * @param context - The extension context
 * @param authManager - The authentication manager instance
 * @returns Disposable for the registered command
 */
export function registerAuthenticateCommand(
  context: vscode.ExtensionContext,
  authManager: AuthManager
): vscode.Disposable {
  return vscode.commands.registerCommand('jira.authenticate', async () => {
    await authenticateFlow(authManager);
  });
}

/**
 * Multi-step authentication flow
 *
 * Guides the user through entering:
 * 1. Jira instance URL
 * 2. Email address
 * 3. API token
 * 4. Tests the credentials
 * 5. Saves them if valid
 *
 * @param authManager - The authentication manager instance
 */
async function authenticateFlow(authManager: AuthManager): Promise<void> {
  try {
    // Step 1: Get Jira instance URL
    const instanceUrl = await vscode.window.showInputBox({
      prompt: 'Enter your Jira instance URL',
      placeHolder: 'https://your-company.atlassian.net',
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) {
          return 'Instance URL is required';
        }
        if (!value.startsWith('https://')) {
          return 'Instance URL must start with https://';
        }
        if (!value.includes('.atlassian.net')) {
          return 'Please enter a valid Atlassian Jira URL (e.g., https://company.atlassian.net)';
        }
        return null;
      }
    });

    if (!instanceUrl) {
      vscode.window.showInformationMessage('Authentication cancelled');
      return;
    }

    // Step 2: Get email address
    const email = await vscode.window.showInputBox({
      prompt: 'Enter your Jira email address',
      placeHolder: 'you@company.com',
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) {
          return 'Email is required';
        }
        if (!value.includes('@')) {
          return 'Please enter a valid email address';
        }
        return null;
      }
    });

    if (!email) {
      vscode.window.showInformationMessage('Authentication cancelled');
      return;
    }

    // Step 3: Get API token
    const apiToken = await vscode.window.showInputBox({
      prompt: 'Enter your Jira API token',
      placeHolder: 'Your API token from Atlassian',
      password: true, // Hide the token input
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) {
          return 'API token is required';
        }
        if (value.length < 10) {
          return 'API token appears to be too short';
        }
        return null;
      }
    });

    if (!apiToken) {
      vscode.window.showInformationMessage('Authentication cancelled');
      return;
    }

    // Show information about getting API token
    const learnMore = 'Learn More';
    const proceed = 'Test Connection';
    const action = await vscode.window.showInformationMessage(
      'You can generate an API token at: https://id.atlassian.com/manage-profile/security/api-tokens',
      proceed,
      learnMore
    );

    if (action === learnMore) {
      vscode.env.openExternal(vscode.Uri.parse('https://id.atlassian.com/manage-profile/security/api-tokens'));
      vscode.window.showInformationMessage('Please re-run the "Jira: Authenticate" command after generating your API token');
      return;
    }

    if (action !== proceed) {
      vscode.window.showInformationMessage('Authentication cancelled');
      return;
    }

    // Step 4: Test the credentials
    const credentials: JiraCredentials = {
      url: instanceUrl.replace(/\/$/, ''), // Remove trailing slash
      email,
      token: apiToken
    };

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Testing connection to Jira...',
        cancellable: false
      },
      async () => {
        try {
          await authManager.testCredentials(credentials);
        } catch (error) {
          if (error instanceof JiraAuthenticationError) {
            throw new Error('Invalid credentials. Please check your email and API token.');
          }
          throw error;
        }
      }
    );

    // Step 5: Save the credentials
    await authManager.setCredentials(credentials);

    // Success!
    vscode.window.showInformationMessage(
      '✅ Successfully authenticated with Jira!',
      'OK'
    );

  } catch (error) {
    // Handle any errors during the flow
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Authentication failed: ${errorMessage}`);
  }
}

/**
 * Register the clear credentials command
 *
 * This command removes all stored Jira credentials from secret storage.
 *
 * @param context - The extension context
 * @param authManager - The authentication manager instance
 * @returns Disposable for the registered command
 */
export function registerClearCredentialsCommand(
  context: vscode.ExtensionContext,
  authManager: AuthManager
): vscode.Disposable {
  return vscode.commands.registerCommand('jira.clearCredentials', async () => {
    const confirm = await vscode.window.showWarningMessage(
      'Are you sure you want to clear your Jira credentials?',
      { modal: true },
      'Yes, Clear Credentials'
    );

    if (confirm === 'Yes, Clear Credentials') {
      await authManager.clearCredentials();
      vscode.window.showInformationMessage('Jira credentials have been cleared');
    }
  });
}
