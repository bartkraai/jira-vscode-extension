import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { CacheManager } from '../api/CacheManager';
import { ConfigManager } from '../config/ConfigManager';
import { ConfirmationHelper } from '../utils/confirmationHelper';
import { parseTimeToSeconds, validateTimeString, formatSecondsToTime } from '../utils/timeParser';

/**
 * Interface for the log_time tool parameters
 */
export interface ILogTimeParameters {
    issueKey: string;
    timeSpent: string;
    description?: string;
}

/**
 * Language Model Tool for logging work time to Jira issues.
 * This tool allows Copilot to log time spent on issues with optional work descriptions.
 *
 * Feature 8.7: Tool: Log Time (Optional)
 * Feature 8.8: Confirmation Flows
 * Time logging is considered a destructive operation and requires user confirmation by default.
 *
 * Supported time formats:
 * - "2h" -> 2 hours
 * - "30m" -> 30 minutes
 * - "2h 30m" -> 2 hours and 30 minutes
 * - "1d" -> 1 day (8 hour work day)
 * - "1w" -> 1 week (40 hour work week)
 * - "1d 4h 30m" -> 1 day, 4 hours, and 30 minutes
 */
export class LogTimeTool implements vscode.LanguageModelTool<ILogTimeParameters> {
    private jiraClient: JiraClient | undefined;
    private authManager: AuthManager;
    private cacheManager: CacheManager;
    private confirmationHelper: ConfirmationHelper;

    constructor(
        private context: vscode.ExtensionContext,
        authManager: AuthManager,
        cacheManager: CacheManager,
        configManager: ConfigManager
    ) {
        this.authManager = authManager;
        this.cacheManager = cacheManager;
        this.confirmationHelper = new ConfirmationHelper(context, configManager);
    }

    /**
     * Called when the tool is about to be invoked.
     * Provides a confirmation message to the user.
     */
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<ILogTimeParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { issueKey, timeSpent, description } = options.input;

        const descText = description ? ` with description` : '';
        return {
            invocationMessage: `Logging ${timeSpent} to ${issueKey}${descText}...`
        };
    }

    /**
     * Executes the tool to log work time to a Jira issue.
     *
     * Feature 8.8: Confirmation Flows
     * Requests user confirmation before logging time.
     */
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ILogTimeParameters>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { issueKey, timeSpent, description } = options.input;

        try {
            // Validate issue key
            if (!issueKey || !issueKey.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: issueKey is required and cannot be empty.'
                    )
                ]);
            }

            // Validate time format
            const validationError = validateTimeString(timeSpent);
            if (validationError) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `Error: ${validationError}\n\nSupported formats:\n- "2h" (2 hours)\n- "30m" (30 minutes)\n- "2h 30m" (2 hours 30 minutes)\n- "1d" (1 day = 8 hours)\n- "1w" (1 week = 40 hours)\n- "1d 4h 30m" (1 day 4 hours 30 minutes)`
                    )
                ]);
            }

            // Parse time to seconds
            const timeSpentSeconds = parseTimeToSeconds(timeSpent);
            if (timeSpentSeconds === null) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Error: Failed to parse time format. Please use formats like "2h", "30m", or "2h 30m".'
                    )
                ]);
            }

            // Feature 8.8: Request confirmation before logging time
            const confirmationDesc = description ? `\n\nDescription: ${description}` : '';
            const approved = await this.confirmationHelper.requestConfirmation(
                'timeLogging',
                `Log ${timeSpent} to ${issueKey}?${confirmationDesc}`,
                'This operation will add a worklog entry to the issue in Jira.'
            );

            if (!approved) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `Time logging cancelled by user. No time was logged to ${issueKey}.`
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

            // Log the time
            const result = await this.jiraClient.logTime(
                issueKey,
                timeSpentSeconds,
                description
            );

            // Format the response
            const formattedTime = formatSecondsToTime(timeSpentSeconds);
            const descriptionText = description ? ` with description: "${description}"` : '';

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Successfully logged ${formattedTime} (${timeSpent}) to ${issueKey}${descriptionText}. Worklog ID: ${result.id}`
                )
            ]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error logging time to ${issueKey}: ${errorMessage}`
                )
            ]);
        }
    }
}
