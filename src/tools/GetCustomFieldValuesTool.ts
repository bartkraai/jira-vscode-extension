import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';

/**
 * Interface for the get_custom_field_values tool parameters
 */
export interface IGetCustomFieldValuesParameters {
    projectKey: string;
    issueType: string;
    fieldName: string;
}

/**
 * Language Model Tool for getting allowed values for a custom field.
 * This tool allows Copilot to discover what values are available for select/multi-select custom fields,
 * making it easier to fill in custom fields correctly.
 */
export class GetCustomFieldValuesTool implements vscode.LanguageModelTool<IGetCustomFieldValuesParameters> {
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<IGetCustomFieldValuesParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { fieldName, projectKey, issueType } = options.input;

        return {
            invocationMessage: `Fetching allowed values for custom field "${fieldName}" in ${projectKey} ${issueType}...`
        };
    }

    /**
     * Executes the tool to get custom field allowed values.
     */
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IGetCustomFieldValuesParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { projectKey, issueType, fieldName } = options.input;

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

            if (!fieldName || !fieldName.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: fieldName is required and cannot be empty.'
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

            // Get allowed values by field name
            const fieldInfo = await this.jiraClient.getCustomFieldAllowedValuesByName(
                projectKey.trim(),
                issueType.trim(),
                fieldName.trim()
            );

            if (!fieldInfo.allowedValues || fieldInfo.allowedValues.length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `No allowed values found for custom field "${fieldName}". It may be a free-text field.`
                    )
                ]);
            }

            // Format the allowed values for display
            const valuesList = fieldInfo.allowedValues.map((value, index) => {
                const displayValue = value.value || value.name || value.id || 'Unknown';
                const valueId = value.id || value.value || value.name || '';
                
                return `${index + 1}. **${displayValue}**${valueId && valueId !== displayValue ? ` (ID: ${valueId})` : ''}`;
            }).join('\n');

            const resultText = `**Allowed values for "${fieldInfo.name}" (${fieldInfo.fieldId})**\n` +
                `**Project:** ${projectKey}\n` +
                `**Issue Type:** ${issueType}\n\n` +
                `${valuesList}\n\n` +
                `**Total:** ${fieldInfo.allowedValues.length} value(s)\n\n` +
                `**Usage:** When setting this custom field, use the value or ID shown above. For example:\n` +
                `\`\`\`json\n` +
                `customFields: {\n` +
                `  "${fieldInfo.fieldId}": { "id": "${fieldInfo.allowedValues[0].id || fieldInfo.allowedValues[0].value}" }\n` +
                `}\n` +
                `\`\`\``;

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(resultText)
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Provide helpful error messages
            if (errorMessage.includes('not found')) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `Error: ${errorMessage}\n\n` +
                        `Tip: Use jira_get_custom_fields tool first to see available custom fields for ${issueType} in ${projectKey}.`
                    )
                ]);
            }

            if (errorMessage.includes('does not have predefined allowed values')) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `The custom field "${fieldName}" is a free-text field and does not have predefined allowed values. ` +
                        `You can enter any text value for this field.`
                    )
                ]);
            }

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error fetching allowed values for "${fieldName}": ${errorMessage}`
                )
            ]);
        }
    }
}
