import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

/**
 * Interface for the update_solution tool parameters
 */
export interface IUpdateSolutionParameters {
    issueKey: string;
    solution: string;
}

/**
 * Language Model Tool for updating the Solution field of a Jira issue.
 * The Solution field is a custom field; this tool resolves its ID automatically
 * and updates it with the provided text.
 */
export class UpdateSolutionTool implements vscode.LanguageModelTool<IUpdateSolutionParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<IUpdateSolutionParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { issueKey } = options.input;
        return {
            invocationMessage: `Updating Solution field for ${issueKey}...`
        };
    }

    /**
     * Executes the tool to update the Solution field of a Jira issue.
     */
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IUpdateSolutionParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { issueKey, solution } = options.input;

        try {
            // Validate parameters
            if (!issueKey || !issueKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: issueKey is required and cannot be empty.'
                    )
                ]);
            }

            if (!solution || !solution.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: solution text is required and cannot be empty.'
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

            // Update the Solution custom field (resolved by name)
            const fieldId = await this.jiraClient.updateCustomTextField(
                issueKey.trim(),
                'Solution',
                solution
            );

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Successfully updated Solution field (${fieldId}) for ${issueKey}.`
                )
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error updating Solution for ${issueKey}: ${errorMessage}`
                )
            ]);
        }
    }
}
