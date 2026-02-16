import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

export interface ILinkIssuesParameters {
    inwardIssueKey: string;
    outwardIssueKey: string;
    linkType: string;
}

export class LinkIssuesTool implements vscode.LanguageModelTool<ILinkIssuesParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<ILinkIssuesParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { inwardIssueKey, outwardIssueKey, linkType } = options.input;
        return {
            invocationMessage: `Linking ${inwardIssueKey} ${linkType} ${outwardIssueKey}...`
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ILinkIssuesParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { inwardIssueKey, outwardIssueKey, linkType } = options.input;

        try {
            if (!inwardIssueKey || !inwardIssueKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: inwardIssueKey is required and cannot be empty.')
                ]);
            }

            if (!outwardIssueKey || !outwardIssueKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: outwardIssueKey is required and cannot be empty.')
                ]);
            }

            if (!linkType || !linkType.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: linkType is required (e.g., "Blocks", "Relates", "Duplicates").')
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

            await this.jiraClient.linkIssues(
                inwardIssueKey.trim(),
                outwardIssueKey.trim(),
                linkType.trim()
            );

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Successfully linked ${inwardIssueKey} ${linkType} ${outwardIssueKey}.`
                )
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error linking issues: ${errorMessage}`)
            ]);
        }
    }
}
