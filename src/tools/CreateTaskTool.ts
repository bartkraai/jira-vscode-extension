import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

/**
 * Interface for the create_task tool parameters
 */
export interface ICreateTaskParameters {
    projectKey: string;
    summary: string;
    description?: string;
    parentKey?: string;
}

/**
 * Language Model Tool for creating Jira tasks.
 * This tool allows Copilot to create tasks in a specified project.
 */
export class CreateTaskTool implements vscode.LanguageModelTool<ICreateTaskParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<ICreateTaskParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { projectKey, summary, parentKey } = options.input;
        const parentInfo = parentKey ? ` under ${parentKey}` : '';

        return {
            invocationMessage: `Creating task in ${projectKey}${parentInfo}: "${summary}"...`
        };
    }

    /**
     * Executes the tool to create a task.
     */
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ICreateTaskParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { projectKey, summary, description, parentKey } = options.input;

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

            // If parentKey is provided, verify it exists
            if (parentKey && parentKey.trim()) {
                try {
                    await this.jiraClient.getIssueDetails(parentKey.trim());
                } catch (error) {
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(
                            `Error: Parent issue ${parentKey} not found or you do not have permission to view it.`
                        )
                    ]);
                }
            }

            // Create the task
            const task = await this.jiraClient.createIssue({
                projectKey: projectKey.trim(),
                summary: summary.trim(),
                description: description?.trim(),
                issueType: 'Task',
                parentKey: parentKey?.trim()
            });

            const parentInfo = parentKey ? ` under ${parentKey}` : '';
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Successfully created task ${task.key}${parentInfo} in project ${projectKey}.`
                )
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Provide helpful error message if the issue type is not found
            if (errorMessage.includes('Task') || errorMessage.includes('issue type')) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `Error creating task: The "Task" issue type may not be available in project ${projectKey}. ${errorMessage}`
                    )
                ]);
            }

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error creating task in ${projectKey}: ${errorMessage}`
                )
            ]);
        }
    }
}
