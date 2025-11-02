import * as vscode from 'vscode';
import { AuthManager } from '../api/AuthManager';
import { ConfigManager } from '../config/ConfigManager';
import { JiraClient, JiraAuthenticationError } from '../api/JiraClient';
import { JiraCredentials } from '../models/jira';

/**
 * Register the configure command (initial setup wizard)
 *
 * This command guides the user through the complete initial setup process,
 * including credential input, connection testing, and project selection.
 *
 * @param context - The extension context
 * @param authManager - The authentication manager instance
 * @param configManager - The configuration manager instance
 * @returns Disposable for the registered command
 */
export function registerConfigureCommand(
  context: vscode.ExtensionContext,
  authManager: AuthManager,
  configManager: ConfigManager
): vscode.Disposable {
  return vscode.commands.registerCommand('jira.configure', async () => {
    await setupWizard(authManager, configManager);
  });
}

/**
 * Multi-step setup wizard
 *
 * Guides the user through the complete initial configuration:
 * 1. Jira instance URL
 * 2. Email address
 * 3. API token
 * 4. Test connection
 * 5. Select default project
 * 6. Save configuration
 *
 * @param authManager - The authentication manager instance
 * @param configManager - The configuration manager instance
 */
async function setupWizard(
  authManager: AuthManager,
  configManager: ConfigManager
): Promise<void> {
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
          return 'URL must start with https://';
        }
        if (!value.includes('.atlassian.net')) {
          return 'Please enter a valid Atlassian Jira URL (e.g., https://company.atlassian.net)';
        }
        return null;
      }
    });

    if (!instanceUrl) {
      vscode.window.showInformationMessage('Setup cancelled');
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
      vscode.window.showInformationMessage('Setup cancelled');
      return;
    }

    // Step 3: Get API token
    const apiToken = await vscode.window.showInputBox({
      prompt: 'Enter your Jira API token',
      placeHolder: 'Generate at https://id.atlassian.com/manage-profile/security/api-tokens',
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
      vscode.window.showInformationMessage('Setup cancelled');
      return;
    }

    // Show information about generating API tokens
    vscode.window.showInformationMessage(
      'API tokens can be generated at: https://id.atlassian.com/manage-profile/security/api-tokens'
    );

    // Step 4: Test connection
    const normalizedUrl = instanceUrl.replace(/\/$/, ''); // Remove trailing slash
    const credentials: JiraCredentials = {
      url: normalizedUrl,
      email,
      token: apiToken
    };

    let client: JiraClient;
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Testing connection to Jira...',
        cancellable: false
      },
      async () => {
        try {
          // Create a temporary client for testing
          client = new JiraClient(normalizedUrl, email, apiToken);
          await client.testConnection();
        } catch (error) {
          if (error instanceof JiraAuthenticationError) {
            throw new Error('Invalid credentials. Please check your email and API token.');
          }
          throw error;
        }
      }
    );

    vscode.window.showInformationMessage('✅ Connection successful!');

    // Step 5: Select default project
    let selectedProject: { label: string; description: string } | undefined;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Fetching projects...',
        cancellable: false
      },
      async () => {
        try {
          const projects = await client!.getProjects();

          if (projects.length === 0) {
            vscode.window.showWarningMessage(
              'No projects found. You can set a default project later in settings.'
            );
            return;
          }

          // Create quick pick items from projects
          const projectItems = projects.map(p => ({
            label: p.name,
            description: p.key,
            detail: p.description || undefined
          }));

          selectedProject = await vscode.window.showQuickPick(projectItems, {
            placeHolder: 'Select default project (optional - you can change this later)',
            ignoreFocusOut: true
          });

        } catch (error) {
          vscode.window.showWarningMessage(
            'Failed to fetch projects. You can set a default project later in settings.'
          );
        }
      }
    );

    // Step 6: Save configuration
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Saving configuration...',
        cancellable: false
      },
      async () => {
        // Save credentials to secret storage
        await authManager.setCredentials(credentials);

        // Save instance URL to workspace settings
        await configManager.setInstanceUrl(normalizedUrl, false);

        // Save project key if selected
        if (selectedProject) {
          await configManager.setProjectKey(selectedProject.description, false);
        }
      }
    );

    // Success!
    const summaryMessage = selectedProject
      ? `Jira extension configured successfully!\n\nInstance: ${normalizedUrl}\nProject: ${selectedProject.label} (${selectedProject.description})`
      : `Jira extension configured successfully!\n\nInstance: ${normalizedUrl}\nNo default project set.`;

    vscode.window.showInformationMessage(
      summaryMessage,
      'OK'
    );

  } catch (error) {
    // Handle any errors during the flow
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Setup failed: ${errorMessage}`);
  }
}
