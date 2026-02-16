import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

/**
 * Interface for the create_subtask tool parameters
 */
export interface ICreateSubtaskParameters {
    parentKey: string;
    summary: string;
    description?: string;
    customFields?: Record<string, any>;
}

/**
 * Language Model Tool for creating Jira subtasks.
 * This tool allows Copilot to create subtasks linked to parent issues.
 */
export class CreateSubtaskTool implements vscode.LanguageModelTool<ICreateSubtaskParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<ICreateSubtaskParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { parentKey, summary } = options.input;

        return {
            invocationMessage: `Creating subtask for ${parentKey}: "${summary}"...`
        };
    }

    /**
     * Executes the tool to create a subtask.
     */
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ICreateSubtaskParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { parentKey, summary, description, customFields } = options.input;

        try {
            // Validate parameters
            if (!parentKey || !parentKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: parentKey is required and cannot be empty.'
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

            // First, verify the parent issue exists and get its project
            let parentIssue;
            try {
                parentIssue = await this.jiraClient.getIssueDetails(parentKey);
            } catch (error) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `Error: Parent issue ${parentKey} not found or you do not have permission to view it.`
                    )
                ]);
            }

            const projectKey = parentIssue.fields.project.key;

            // Create the subtask
            // Note: In Jira, "Sub-task" is typically the issue type name for subtasks
            const subtask = await this.jiraClient.createIssue({
                projectKey: projectKey,
                summary: summary.trim(),
                description: description?.trim(),
                issueType: 'Sub-task',
                parentKey: parentKey.trim(),
                customFields
            });

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Successfully created subtask ${subtask.key} under ${parentKey}.`
                )
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Provide helpful error message if the issue type is not found
            if (errorMessage.includes('Sub-task') || errorMessage.includes('issue type')) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `Error creating subtask: The "Sub-task" issue type may not be available in this project. ${errorMessage}`
                    )
                ]);
            }

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error creating subtask for ${parentKey}: ${errorMessage}`
                )
            ]);
        }
    }
}
