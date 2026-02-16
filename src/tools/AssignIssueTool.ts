import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

export interface IAssignIssueParameters {
    issueKey: string;
    accountId?: string;
    unassign?: boolean;
}

export class AssignIssueTool implements vscode.LanguageModelTool<IAssignIssueParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<IAssignIssueParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { issueKey, unassign } = options.input;
        const action = unassign ? 'Unassigning' : 'Assigning';
        return {
            invocationMessage: `${action} issue ${issueKey}...`
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IAssignIssueParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { issueKey, accountId, unassign } = options.input;

        try {
            if (!issueKey || !issueKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: issueKey is required and cannot be empty.')
                ]);
            }

            if (!unassign && (!accountId || !accountId.trim())) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: accountId is required when assigning (or set unassign=true to unassign).')
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

            const assigneeId = unassign ? null : accountId!.trim();
            await this.jiraClient.assignIssue(issueKey.trim(), assigneeId);

            const message = unassign
                ? `Successfully unassigned issue ${issueKey}.`
                : `Successfully assigned issue ${issueKey} to user ${accountId}.`;

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(message)
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error assigning issue ${issueKey}: ${errorMessage}`)
            ]);
        }
    }
}
