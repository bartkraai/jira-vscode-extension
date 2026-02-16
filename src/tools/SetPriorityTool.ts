import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

export interface ISetPriorityParameters {
    issueKey: string;
    priority: string;
}

export class SetPriorityTool implements vscode.LanguageModelTool<ISetPriorityParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<ISetPriorityParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { issueKey, priority } = options.input;
        return {
            invocationMessage: `Setting priority of ${issueKey} to ${priority}...`
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ISetPriorityParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { issueKey, priority } = options.input;

        try {
            if (!issueKey || !issueKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: issueKey is required and cannot be empty.')
                ]);
            }

            if (!priority || !priority.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: priority is required and cannot be empty.')
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

            await this.jiraClient.setPriority(issueKey.trim(), priority.trim());

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Successfully set priority of ${issueKey} to ${priority}.`
                )
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error setting priority for ${issueKey}: ${errorMessage}`)
            ]);
        }
    }
}
