import * as vscode from 'vscode';
import { ConfigManager } from '../config/ConfigManager';

/**
 * Type of tool operation that may require confirmation
 *
 * Feature 8.8: Confirmation Flows
 */
export type ToolOperationType =
  | 'statusChange'
  | 'timeLogging'
  | 'createSubtask'
  | 'linkPR'
  | 'addComment';

/**
 * Result of a confirmation dialog
 */
export interface ConfirmationResult {
  /** Whether the user approved the operation */
  approved: boolean;
  /** Whether the user selected "Always Allow" for this operation type */
  alwaysAllow: boolean;
}

/**
 * State key prefix for storing "always allow" preferences
 * These are stored in workspace state to persist across sessions
 */
const ALWAYS_ALLOW_KEY_PREFIX = 'jira.alwaysAllow.';

/**
 * Helper class for managing confirmation flows for Copilot tool operations
 *
 * Feature 8.8: Confirmation Flows
 *
 * This class handles:
 * - Checking if confirmation is required based on configuration
 * - Showing confirmation dialogs to users
 * - Managing "always allow" preferences with workspace state persistence
 * - Providing consistent confirmation UI across all tools
 */
export class ConfirmationHelper {
  constructor(
    private context: vscode.ExtensionContext,
    private configManager: ConfigManager
  ) {}

  /**
   * Check if an operation requires confirmation
   *
   * This checks both the configuration setting and any stored "always allow" preferences.
   * If the user has previously selected "Always Allow" for this operation type,
   * confirmation will not be required.
   *
   * @param operationType - The type of operation to check
   * @returns true if confirmation is required, false otherwise
   */
  async requiresConfirmation(operationType: ToolOperationType): Promise<boolean> {
    // Check if user has "always allowed" this operation type
    const alwaysAllowKey = `${ALWAYS_ALLOW_KEY_PREFIX}${operationType}`;
    const alwaysAllow = this.context.workspaceState.get<boolean>(alwaysAllowKey, false);

    if (alwaysAllow) {
      return false;
    }

    // Check configuration setting
    const confirmationSettings = this.configManager.requireConfirmation;
    return confirmationSettings[operationType] ?? false;
  }

  /**
   * Show a confirmation dialog for a tool operation
   *
   * Displays a modal dialog asking the user to confirm the operation.
   * Provides "Approve", "Reject", and "Always Allow" options.
   *
   * @param operationType - The type of operation requiring confirmation
   * @param message - Description of the operation to show to the user
   * @param details - Optional additional details to display
   * @returns ConfirmationResult indicating whether the operation was approved and if "always allow" was selected
   *
   * @example
   * ```typescript
   * const result = await confirmationHelper.showConfirmation(
   *   'statusChange',
   *   'Change status to "In Progress"',
   *   'Issue: PROJ-123'
   * );
   * if (result.approved) {
   *   // Execute the operation
   * }
   * ```
   */
  async showConfirmation(
    operationType: ToolOperationType,
    message: string,
    details?: string
  ): Promise<ConfirmationResult> {
    // Build the confirmation message
    let confirmMessage = `Copilot Tool Confirmation\n\n${message}`;
    if (details) {
      confirmMessage += `\n\n${details}`;
    }

    // Show modal dialog with three options
    const selection = await vscode.window.showInformationMessage(
      confirmMessage,
      { modal: true },
      'Approve',
      'Always Allow',
      'Reject'
    );

    // Handle user response
    if (selection === 'Approve') {
      return { approved: true, alwaysAllow: false };
    } else if (selection === 'Always Allow') {
      // Store the "always allow" preference
      await this.setAlwaysAllow(operationType, true);
      return { approved: true, alwaysAllow: true };
    } else {
      // User clicked "Reject" or dismissed the dialog
      return { approved: false, alwaysAllow: false };
    }
  }

  /**
   * Request confirmation for a tool operation if needed
   *
   * This is the main method to use in tool implementations. It checks if
   * confirmation is required and shows the dialog if necessary.
   *
   * @param operationType - The type of operation requiring confirmation
   * @param message - Description of the operation
   * @param details - Optional additional details
   * @returns true if the operation is approved (either by confirmation or because no confirmation was needed)
   *
   * @example
   * ```typescript
   * const approved = await confirmationHelper.requestConfirmation(
   *   'statusChange',
   *   'Change PROJ-123 status to "In Progress"'
   * );
   * if (!approved) {
   *   return new vscode.LanguageModelToolResult([
   *     new vscode.LanguageModelTextPart('Operation cancelled by user.')
   *   ]);
   * }
   * // Continue with the operation...
   * ```
   */
  async requestConfirmation(
    operationType: ToolOperationType,
    message: string,
    details?: string
  ): Promise<boolean> {
    // Check if confirmation is required
    const needsConfirmation = await this.requiresConfirmation(operationType);

    if (!needsConfirmation) {
      return true; // No confirmation needed, approve automatically
    }

    // Show confirmation dialog
    const result = await this.showConfirmation(operationType, message, details);
    return result.approved;
  }

  /**
   * Set or clear the "always allow" preference for an operation type
   *
   * @param operationType - The type of operation
   * @param allow - true to always allow, false to clear the preference
   */
  async setAlwaysAllow(operationType: ToolOperationType, allow: boolean): Promise<void> {
    const alwaysAllowKey = `${ALWAYS_ALLOW_KEY_PREFIX}${operationType}`;
    await this.context.workspaceState.update(alwaysAllowKey, allow);
  }

  /**
   * Clear all "always allow" preferences
   *
   * Resets all stored preferences so that confirmation dialogs will be shown again
   * according to the configuration settings.
   */
  async clearAllAlwaysAllow(): Promise<void> {
    const operationTypes: ToolOperationType[] = [
      'statusChange',
      'timeLogging',
      'createSubtask',
      'linkPR',
      'addComment'
    ];

    for (const operationType of operationTypes) {
      await this.setAlwaysAllow(operationType, false);
    }
  }

  /**
   * Get the current "always allow" status for an operation type
   *
   * @param operationType - The type of operation to check
   * @returns true if "always allow" is enabled for this operation
   */
  async isAlwaysAllowed(operationType: ToolOperationType): Promise<boolean> {
    const alwaysAllowKey = `${ALWAYS_ALLOW_KEY_PREFIX}${operationType}`;
    return this.context.workspaceState.get<boolean>(alwaysAllowKey, false);
  }
}
