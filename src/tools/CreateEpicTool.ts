import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

/**
 * Interface for the create_epic tool parameters
 */
export interface ICreateEpicParameters {
    projectKey: string;
    summary: string;
    description?: string;
}

/**
 * Language Model Tool for creating Jira epics.
 * This tool allows Copilot to create epics in a specified project.
 */
export class CreateEpicTool implements vscode.LanguageModelTool<ICreateEpicParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<ICreateEpicParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { projectKey, summary } = options.input;

        return {
            invocationMessage: `Creating epic in ${projectKey}: "${summary}"...`
        };
    }

    /**
     * Executes the tool to create an epic.
     */
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ICreateEpicParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { projectKey, summary, description } = options.input;

        try {
            // Validate parameters
            if (!projectKey || !projectKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: projectKey is required and cannot be empty.'
                    )
                ]);
            }

            if (!summary || !summary.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: summary is required and cannot be empty.'
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

            // Create the epic
            // Note: In Jira, "Epic" is the issue type name for epics
            const epic = await this.jiraClient.createIssue({
                projectKey: projectKey.trim(),
                summary: summary.trim(),
                description: description?.trim(),
                issueType: 'Epic'
            });

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Successfully created epic ${epic.key} in project ${projectKey}.`
                )
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Provide helpful error message if the issue type is not found
            if (errorMessage.includes('Epic') || errorMessage.includes('issue type')) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `Error creating epic: The "Epic" issue type may not be available in project ${projectKey}. ${errorMessage}`
                    )
                ]);
            }

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error creating epic in ${projectKey}: ${errorMessage}`
                )
            ]);
        }
    }
}
