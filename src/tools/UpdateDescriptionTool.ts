import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

/**
 * Interface for the update_description tool parameters
 */
export interface IUpdateDescriptionParameters {
    issueKey: string;
    description: string;
}

/**
 * Language Model Tool for updating the description of a Jira issue.
 * This tool allows Copilot to set or replace the description field on an issue.
 * Plain text is automatically converted to Atlassian Document Format (ADF).
 */
export class UpdateDescriptionTool implements vscode.LanguageModelTool<IUpdateDescriptionParameters> {
    private jiraClient: JiraClient | undefined;
    private authManager: AuthManager;
    private cacheManager: CacheManager;

    constructor(
        private context: vscode.ExtensionContext,
        authManager: AuthManager,
        cacheManager: CacheManager
    ) {
        this.authManager = authManager;
        this.cacheManager = cacheManager;
    }

    /**
     * Called when the tool is about to be invoked.
     * Provides a confirmation message to the user.
     */
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IUpdateDescriptionParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { issueKey } = options.input;
        return {
            invocationMessage: `Updating description for ${issueKey}...`
        };
    }

    /**
     * Executes the tool to update the description of a Jira issue.
     */
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IUpdateDescriptionParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { issueKey, description } = options.input;

        try {
            // Validate parameters
            if (!issueKey || !issueKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: issueKey is required and cannot be empty.'
                    )
                ]);
            }

            if (!description || !description.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: description text is required and cannot be empty.'
                    )
                ]);
            }

            // Get or create Jira client
            if (!this.jiraClient) {
                const credentials = await this.authManager.getCredentials();
                if (!credentials) {
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(
                            'Jira credentials are not configured. Please run "Jira: Configure" command to set up authentication.'
                        )
                    ]);
                }

                this.jiraClient = new JiraClient(
                    credentials.url,
                    credentials.email,
                    credentials.token,
                    this.cacheManager
                );
            }

            // Update the description
            await this.jiraClient.updateDescription(issueKey.trim(), description);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Successfully updated description for ${issueKey}.`
                )
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error updating description for ${issueKey}: ${errorMessage}`
                )
            ]);
        }
    }
}
