import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

export interface IGetProjectParameters {
    projectKey: string;
}

export class GetProjectTool implements vscode.LanguageModelTool<IGetProjectParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<IGetProjectParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { projectKey } = options.input;
        return {
            invocationMessage: `Fetching project details for ${projectKey}...`
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IGetProjectParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { projectKey } = options.input;

        try {
            if (!projectKey || !projectKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: projectKey is required and cannot be empty.')
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

            const project = await this.jiraClient.getProjectDetails(projectKey.trim());

            let resultText = `Project: ${project.name} (${project.key})\n`;
            if (project.description) {
                resultText += `Description: ${project.description}\n`;
            }
            resultText += `Project Type: ${project.projectTypeKey}\n`;
            
            if (project.lead) {
                resultText += `Lead: ${project.lead.displayName}\n`;
            }

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(resultText)
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error fetching project ${projectKey}: ${errorMessage}`)
            ]);
        }
    }
}
