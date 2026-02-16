import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

export interface ISearchIssuesParameters {
    jql: string;
    maxResults?: number;
}

export class SearchIssuesTool implements vscode.LanguageModelTool<ISearchIssuesParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<ISearchIssuesParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { jql } = options.input;
        return {
            invocationMessage: `Searching issues with JQL: ${jql}...`
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ISearchIssuesParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { jql, maxResults } = options.input;

        try {
            if (!jql || !jql.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: jql query is required and cannot be empty.')
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

            const issues = await this.jiraClient.searchIssues(jql.trim(), {
                maxResults: maxResults || 50,
                useCache: true
            });

            if (issues.length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('No issues found matching your search criteria.')
                ]);
            }

            let resultText = `Found ${issues.length} issue(s):\n\n`;
            
            issues.forEach((issue, index) => {
                const status = issue.fields.status?.name || 'Unknown';
                const priority = issue.fields.priority?.name || 'None';
                const assignee = issue.fields.assignee?.displayName || 'Unassigned';
                resultText += `${index + 1}. ${issue.key}: ${issue.fields.summary}\n`;
                resultText += `   Status: ${status} | Priority: ${priority} | Assignee: ${assignee}\n\n`;
            });

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(resultText.trim())
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error searching issues: ${errorMessage}`)
            ]);
        }
    }
}
