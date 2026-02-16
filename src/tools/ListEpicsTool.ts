import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

/**
 * Interface for the list_epics tool parameters
 */
export interface IListEpicsParameters {
    projectKey: string;
    maxResults?: number;
}

/**
 * Language Model Tool for listing Jira epics.
 * This tool allows Copilot to list all epics in a specified project.
 */
export class ListEpicsTool implements vscode.LanguageModelTool<IListEpicsParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<IListEpicsParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { projectKey } = options.input;

        return {
            invocationMessage: `Fetching epics from project ${projectKey}...`
        };
    }

    /**
     * Executes the tool to list epics.
     */
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IListEpicsParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { projectKey, maxResults } = options.input;

        try {
            // Validate parameters
            if (!projectKey || !projectKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: projectKey is required and cannot be empty.'
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

            // Fetch epics from the project
            const epics = await this.jiraClient.getEpics(projectKey.trim(), {
                maxResults: maxResults || 100,
                useCache: true
            });

            // Check if no epics found
            if (epics.length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `No epics found in project ${projectKey}.`
                    )
                ]);
            }

            // Format the epics list
            let resultText = `Found ${epics.length} epic(s) in project ${projectKey}:\n\n`;
            
            epics.forEach((epic, index) => {
                const status = epic.fields.status?.name || 'Unknown';
                const assignee = epic.fields.assignee?.displayName || 'Unassigned';
                resultText += `${index + 1}. ${epic.key}: ${epic.fields.summary}\n`;
                resultText += `   Status: ${status} | Assignee: ${assignee}\n\n`;
            });

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(resultText.trim())
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Provide helpful error messages
            if (errorMessage.includes('project') || errorMessage.includes('Project')) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `Error: Project ${projectKey} not found or you do not have permission to view it. ${errorMessage}`
                    )
                ]);
            }

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error fetching epics from project ${projectKey}: ${errorMessage}`
                )
            ]);
        }
    }
}
