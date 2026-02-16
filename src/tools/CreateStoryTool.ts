import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

export interface ICreateStoryParameters {
    projectKey: string;
    summary: string;
    description?: string;
    parentKey?: string;
}

export class CreateStoryTool implements vscode.LanguageModelTool<ICreateStoryParameters> {
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

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<ICreateStoryParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { projectKey, summary } = options.input;
        return {
            invocationMessage: `Creating story in ${projectKey}: "${summary}"...`
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ICreateStoryParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { projectKey, summary, description, parentKey } = options.input;

        try {
            if (!projectKey || !projectKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: projectKey is required and cannot be empty.')
                ]);
            }

            if (!summary || !summary.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: summary is required and cannot be empty.')
                ]);
            }

            if (!this.jiraClient) {
                const credentials = await this.authManager.getCredentials();
                if (!credentials) {
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(
                            'Jira credentials are not configured. Please run "Jira: Configure" command.'
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

            const story = await this.jiraClient.createIssue({
                projectKey: projectKey.trim(),
                summary: summary.trim(),
                description: description?.trim(),
                issueType: 'Story',
                parentKey: parentKey?.trim()
            });

            const parentInfo = parentKey ? ` under ${parentKey}` : '';
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Successfully created story ${story.key}${parentInfo} in project ${projectKey}.`
                )
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error creating story in ${projectKey}: ${errorMessage}`)
            ]);
        }
    }
}
