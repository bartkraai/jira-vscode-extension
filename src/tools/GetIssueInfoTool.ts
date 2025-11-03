import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

/**
 * Interface for the get_issue_info tool parameters
 */
export interface IGetIssueInfoParameters {
    issueKey: string;
}

/**
 * Proof of concept Language Model Tool for retrieving Jira issue information.
 * This tool allows Copilot to fetch details about a specific Jira issue.
 */
export class GetIssueInfoTool implements vscode.LanguageModelTool<IGetIssueInfoParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<IGetIssueInfoParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const issueKey = options.input.issueKey;

        return {
            invocationMessage: `Fetching information for Jira issue ${issueKey}...`
        };
    }

    /**
     * Executes the tool to retrieve Jira issue information.
     */
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IGetIssueInfoParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const params = options.input;
        const issueKey = params.issueKey;

        try {
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

            // Fetch issue details from Jira
            const issue = await this.jiraClient.getIssueDetails(issueKey);

            if (!issue) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `Issue ${issueKey} was not found or you do not have permission to view it.`
                    )
                ]);
            }

            // Format the issue information for the language model
            const issueInfo = this.formatIssueInfo(issue);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(issueInfo)
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error fetching issue ${issueKey}: ${errorMessage}`
                )
            ]);
        }
    }

    /**
     * Formats issue information into a readable string for the language model.
     */
    private formatIssueInfo(issue: any): string {
        const lines: string[] = [];

        lines.push(`# ${issue.key}: ${issue.fields.summary}`);
        lines.push('');
        lines.push(`**Type**: ${issue.fields.issuetype.name}`);
        lines.push(`**Status**: ${issue.fields.status.name}`);
        lines.push(`**Priority**: ${issue.fields.priority?.name || 'None'}`);
        lines.push(`**Reporter**: ${issue.fields.reporter?.displayName || 'Unknown'}`);
        lines.push(`**Assignee**: ${issue.fields.assignee?.displayName || 'Unassigned'}`);

        if (issue.fields.created) {
            lines.push(`**Created**: ${new Date(issue.fields.created).toLocaleDateString()}`);
        }

        if (issue.fields.updated) {
            lines.push(`**Updated**: ${new Date(issue.fields.updated).toLocaleDateString()}`);
        }

        lines.push('');
        lines.push('## Description');

        if (issue.fields.description) {
            // Handle ADF (Atlassian Document Format)
            const description = this.extractTextFromADF(issue.fields.description);
            lines.push(description || 'No description provided');
        } else {
            lines.push('No description provided');
        }

        // Add comments count if available
        if (issue.fields.comment?.total) {
            lines.push('');
            lines.push(`**Comments**: ${issue.fields.comment.total} comment(s)`);
        }

        return lines.join('\n');
    }

    /**
     * Extracts plain text from Atlassian Document Format (ADF).
     * This is a simplified extraction - a full implementation would handle all ADF node types.
     */
    private extractTextFromADF(adf: any): string {
        if (typeof adf === 'string') {
            return adf;
        }

        if (!adf || !adf.content) {
            return '';
        }

        const extractText = (node: any): string => {
            if (node.type === 'text') {
                return node.text || '';
            }

            if (node.content && Array.isArray(node.content)) {
                return node.content.map(extractText).join('');
            }

            return '';
        };

        return adf.content.map(extractText).join('\n\n');
    }
}
