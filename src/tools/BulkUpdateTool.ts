import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

export interface IBulkUpdateParameters {
    issueKeys: string[];
    fields: any;
}

export class BulkUpdateTool implements vscode.LanguageModelTool<IBulkUpdateParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<IBulkUpdateParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { issueKeys } = options.input;
        return {
            invocationMessage: `Bulk updating ${issueKeys.length} issue(s)...`
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IBulkUpdateParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { issueKeys, fields } = options.input;

        try {
            if (!issueKeys || issueKeys.length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: issueKeys array is required and cannot be empty.')
                ]);
            }

            if (!fields) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: fields object is required.')
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

            await this.jiraClient.bulkUpdateIssues(issueKeys.map(k => k.trim()), fields);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Successfully bulk updated ${issueKeys.length} issue(s): ${issueKeys.join(', ')}`
                )
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error bulk updating issues: ${errorMessage}`)
            ]);
        }
    }
}
