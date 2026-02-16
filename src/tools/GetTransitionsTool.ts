import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

export interface IGetTransitionsParameters {
    issueKey: string;
}

export class GetTransitionsTool implements vscode.LanguageModelTool<IGetTransitionsParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<IGetTransitionsParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { issueKey } = options.input;
        return {
            invocationMessage: `Fetching available transitions for ${issueKey}...`
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IGetTransitionsParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { issueKey } = options.input;

        try {
            if (!issueKey || !issueKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: issueKey is required and cannot be empty.')
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

            const transitions = await this.jiraClient.getAvailableTransitions(issueKey.trim());

            if (transitions.length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(`No transitions available for ${issueKey}.`)
                ]);
            }

            let resultText = `Available transitions for ${issueKey}:\n\n`;
            transitions.forEach((transition, index) => {
                const toStatus = transition.to?.name || 'Unknown';
                resultText += `${index + 1}. ${transition.name} (ID: ${transition.id}) → ${toStatus}\n`;
            });

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(resultText.trim())
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error fetching transitions for ${issueKey}: ${errorMessage}`)
            ]);
        }
    }
}
