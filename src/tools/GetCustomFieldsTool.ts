import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

/**
 * Interface for the get_custom_fields tool parameters
 */
export interface IGetCustomFieldsParameters {
    projectKey: string;
    issueType: string;
}

/**
 * Language Model Tool for getting custom field metadata.
 * This tool allows Copilot to discover available custom fields for a project and issue type,
 * including their allowed values and requirements.
 */
export class GetCustomFieldsTool implements vscode.LanguageModelTool<IGetCustomFieldsParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<IGetCustomFieldsParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { projectKey, issueType } = options.input;

        return {
            invocationMessage: `Fetching custom fields for ${issueType} in ${projectKey}...`
        };
    }

    /**
     * Executes the tool to get custom field metadata.
     */
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IGetCustomFieldsParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { projectKey, issueType } = options.input;

        try {
            // Validate parameters
            if (!projectKey || !projectKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: projectKey is required and cannot be empty.'
                    )
                ]);
            }

            if (!issueType || !issueType.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: issueType is required and cannot be empty.'
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

            // Get custom fields metadata
            const customFieldsMetadata = await this.jiraClient.getCustomFields(
                projectKey.trim(),
                issueType.trim()
            );

            if (customFieldsMetadata.customFields.length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `No custom fields found for ${issueType} in project ${projectKey}.`
                    )
                ]);
            }

            // Format custom fields information for display
            const fieldDescriptions = customFieldsMetadata.customFields.map(field => {
                let description = `- **${field.name}** (${field.fieldId})`;
                
                if (field.required) {
                    description += ' - REQUIRED';
                }

                description += `\n  Type: ${field.schema.type}`;
                
                if (field.schema.custom) {
                    description += ` (${field.schema.custom})`;
                }

                if (field.allowedValues && field.allowedValues.length > 0) {
                    const values = field.allowedValues
                        .slice(0, 10) // Show max 10 values
                        .map(v => v.value || v.name || v.id)
                        .filter(Boolean)
                        .join(', ');
                    
                    if (values) {
                        description += `\n  Allowed values: ${values}`;
                        if (field.allowedValues.length > 10) {
                            description += ` (and ${field.allowedValues.length - 10} more)`;
                        }
                    }
                }

                if (field.defaultValue) {
                    description += `\n  Default: ${JSON.stringify(field.defaultValue)}`;
                }

                return description;
            }).join('\n\n');

            const resultText = `**Custom fields for ${issueType} in project ${projectKey}:**\n\n${fieldDescriptions}\n\n` +
                `Total: ${customFieldsMetadata.customFields.length} custom field(s)\n\n` +
                `**Usage:** When creating or updating issues, use the field ID (e.g., customfield_10001) as the key in the customFields parameter.`;

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(resultText)
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error fetching custom fields for ${issueType} in ${projectKey}: ${errorMessage}`
                )
            ]);
        }
    }
}
