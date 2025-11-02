import * as vscode from 'vscode';
import { JiraClient, JiraAuthenticationError } from './JiraClient';
import { JiraCredentials } from '../models/jira';

/**
 * AuthManager - Manages authentication and credentials for Jira
 *
 * Uses VS Code's SecretStorage API to securely store credentials.
 * NEVER stores credentials in settings.json or workspace configuration.
 *
 * @see https://code.visualstudio.com/api/references/vscode-api#SecretStorage
 */
export class AuthManager {
  private static readonly INSTANCE_URL_KEY = 'jira.instanceUrl';
  private static readonly EMAIL_KEY = 'jira.email';
  private static readonly API_TOKEN_KEY = 'jira.apiToken';

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Get stored credentials
   *
   * @returns Promise with credentials if all three values exist, null otherwise
   */
  async getCredentials(): Promise<JiraCredentials | null> {
    const url = await this.context.secrets.get(AuthManager.INSTANCE_URL_KEY);
    const email = await this.context.secrets.get(AuthManager.EMAIL_KEY);
    const token = await this.context.secrets.get(AuthManager.API_TOKEN_KEY);

    if (!url || !email || !token) {
      return null;
    }

    return {
      url,
      email,
      token
    };
  }

  /**
   * Set and store credentials securely
   *
   * @param credentials - The Jira credentials to store
   * @returns Promise that resolves when credentials are stored
   */
  async setCredentials(credentials: JiraCredentials): Promise<void> {
    await this.context.secrets.store(AuthManager.INSTANCE_URL_KEY, credentials.url);
    await this.context.secrets.store(AuthManager.EMAIL_KEY, credentials.email);
    await this.context.secrets.store(AuthManager.API_TOKEN_KEY, credentials.token);
  }

  /**
   * Clear all stored credentials
   *
   * @returns Promise that resolves when credentials are deleted
   */
  async clearCredentials(): Promise<void> {
    await this.context.secrets.delete(AuthManager.INSTANCE_URL_KEY);
    await this.context.secrets.delete(AuthManager.EMAIL_KEY);
    await this.context.secrets.delete(AuthManager.API_TOKEN_KEY);
  }

  /**
   * Test if credentials are valid by making a test API call
   *
   * @param credentials - The credentials to test
   * @returns Promise that resolves if credentials are valid
   * @throws JiraAuthenticationError if credentials are invalid
   */
  async testCredentials(credentials: JiraCredentials): Promise<void> {
    const client = new JiraClient(
      credentials.url,
      credentials.email,
      credentials.token
    );

    try {
      await client.testConnection();
    } catch (error) {
      if (error instanceof JiraAuthenticationError) {
        throw error;
      }
      // Re-throw other errors (network, etc.)
      throw new Error(`Failed to connect to Jira: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if credentials are currently stored
   *
   * @returns Promise with boolean indicating if credentials exist
   */
  async hasCredentials(): Promise<boolean> {
    const credentials = await this.getCredentials();
    return credentials !== null;
  }
}
