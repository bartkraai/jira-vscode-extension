import * as vscode from 'vscode';
import { JiraClient } from '../api/JiraClient';
import { AuthManager } from '../api/AuthManager';
import { ConfigManager } from '../config/ConfigManager';
import { CacheManager } from '../api/CacheManager';
import { JiraIssue } from '../models/jira';

/**
 * Tree item representing a status group (e.g., "To Do", "In Progress", etc.)
 */
export class StatusGroupItem extends vscode.TreeItem {
	public readonly type = 'statusGroup';

	constructor(
		public readonly status: string,
		public readonly count: number
	) {
		super(
			`${status} (${count})`,
			vscode.TreeItemCollapsibleState.Expanded
		);
		this.contextValue = 'statusGroup';
		this.iconPath = new vscode.ThemeIcon('folder');
		this.tooltip = `${count} issue${count !== 1 ? 's' : ''} in ${status}`;
	}
}

/**
 * Tree item representing a Jira issue
 */
export class IssueItem extends vscode.TreeItem {
	public readonly type = 'issue';

	constructor(public readonly issue: JiraIssue) {
		super(
			`${issue.key}: ${issue.fields.summary}`,
			vscode.TreeItemCollapsibleState.None
		);
		this.contextValue = 'issue';
		this.tooltip = this.buildTooltip();
		this.description = this.buildDescription();
		this.iconPath = this.getIconForIssueType();

		// Make the item clickable - open the issue in Jira
		this.command = {
			command: 'jira.openIssue',
			title: 'Open Issue',
			arguments: [this.issue.key]
		};
	}

	/**
	 * Build a detailed tooltip for the issue
	 */
	private buildTooltip(): string {
		const { fields } = this.issue;
		const lines = [
			`${this.issue.key}: ${fields.summary}`,
			``,
			`Type: ${fields.issuetype.name}`,
			`Status: ${fields.status.name}`,
			`Priority: ${fields.priority.name}`,
			`Assignee: ${fields.assignee?.displayName || 'Unassigned'}`,
			`Reporter: ${fields.reporter.displayName}`,
			``,
			`Created: ${new Date(fields.created).toLocaleDateString()}`,
			`Updated: ${new Date(fields.updated).toLocaleDateString()}`
		];

		if (fields.labels && fields.labels.length > 0) {
			lines.push(`Labels: ${fields.labels.join(', ')}`);
		}

		return lines.join('\n');
	}

	/**
	 * Build the description text shown next to the issue key
	 */
	private buildDescription(): string {
		const priority = this.getPriorityEmoji(this.issue.fields.priority.name);
		return `${priority} ${this.issue.fields.issuetype.name}`;
	}

	/**
	 * Get emoji for priority level
	 */
	private getPriorityEmoji(priority: string): string {
		const emojiMap: Record<string, string> = {
			'Highest': '🔴',
			'High': '🟠',
			'Medium': '🟡',
			'Low': '🟢',
			'Lowest': '⚪'
		};
		return emojiMap[priority] || '⚪';
	}

	/**
	 * Get VS Code theme icon for issue type
	 */
	private getIconForIssueType(): vscode.ThemeIcon {
		const iconMap: Record<string, string> = {
			'Bug': 'bug',
			'Story': 'book',
			'Task': 'checklist',
			'Epic': 'milestone',
			'Subtask': 'list-tree',
			'Sub-task': 'list-tree'
		};
		const iconName = iconMap[this.issue.fields.issuetype.name] || 'circle-outline';
		return new vscode.ThemeIcon(iconName);
	}
}

/**
 * Type for all tree items
 */
export type TreeItem = StatusGroupItem | IssueItem;

/**
 * Tree data provider for displaying Jira issues in the VS Code sidebar
 *
 * This provider organizes issues by status (To Do, In Progress, Done, etc.)
 * and displays them in a hierarchical tree view.
 */
export class JiraTreeProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(
		private authManager: AuthManager,
		private configManager: ConfigManager,
		private cacheManager: CacheManager
	) {}

	/**
	 * Create a JiraClient instance with current credentials
	 *
	 * @returns JiraClient instance or null if credentials are not available
	 * @throws Error if credentials are invalid or not configured
	 */
	private async getJiraClient(): Promise<JiraClient | null> {
		try {
			const credentials = await this.authManager.getCredentials();
			if (!credentials) {
				return null;
			}
			return new JiraClient(
				credentials.url,
				credentials.email,
				credentials.token,
				this.cacheManager
			);
		} catch (error) {
			return null;
		}
	}

	/**
	 * Refresh the entire tree view
	 *
	 * This triggers a reload of all data from Jira
	 */
	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Get the tree item representation for display in VS Code
	 *
	 * @param element - The tree item to display
	 * @returns The tree item as-is (already properly formatted)
	 */
	getTreeItem(element: TreeItem): vscode.TreeItem {
		return element;
	}

	/**
	 * Get children for a tree element
	 *
	 * @param element - The parent element, or undefined for root
	 * @returns Array of child tree items
	 */
	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		try {
			// Check if credentials are available
			const client = await this.getJiraClient();
			if (!client) {
				// No credentials - show empty state
				// The user will need to run "Jira: Configure" first
				return [];
			}

			if (!element) {
				// Root level - return status groups
				return await this.getStatusGroups(client);
			} else if (element.type === 'statusGroup') {
				// Return issues for this status
				return await this.getIssuesForStatus(client, (element as StatusGroupItem).status);
			}
			return [];
		} catch (error) {
			// If there's an error fetching data, show an error message
			vscode.window.showErrorMessage(
				`Failed to fetch Jira issues: ${error instanceof Error ? error.message : String(error)}`
			);
			return [];
		}
	}

	/**
	 * Get status groups (root level of tree)
	 *
	 * Fetches all assigned issues and groups them by status
	 *
	 * @param client - The JiraClient instance to use
	 * @returns Array of status group items
	 */
	private async getStatusGroups(client: JiraClient): Promise<StatusGroupItem[]> {
		const issues = await client.getAssignedIssues();

		// Handle empty state
		if (issues.length === 0) {
			return [];
		}

		const grouped = this.groupByStatus(issues);

		// Sort statuses in a logical order (To Do, In Progress, Done, etc.)
		const statusOrder = this.getStatusOrder(grouped);

		return statusOrder.map(status =>
			new StatusGroupItem(status, grouped[status].length)
		);
	}

	/**
	 * Get issues for a specific status
	 *
	 * @param client - The JiraClient instance to use
	 * @param status - The status to filter by
	 * @returns Array of issue items
	 */
	private async getIssuesForStatus(client: JiraClient, status: string): Promise<IssueItem[]> {
		const issues = await client.getAssignedIssues();
		return issues
			.filter(issue => issue.fields.status.name === status)
			.map(issue => new IssueItem(issue));
	}

	/**
	 * Group issues by status
	 *
	 * @param issues - Array of Jira issues
	 * @returns Object mapping status names to arrays of issues
	 */
	private groupByStatus(issues: JiraIssue[]): Record<string, JiraIssue[]> {
		return issues.reduce((acc, issue) => {
			const status = issue.fields.status.name;
			if (!acc[status]) {
				acc[status] = [];
			}
			acc[status].push(issue);
			return acc;
		}, {} as Record<string, JiraIssue[]>);
	}

	/**
	 * Get a logical ordering of statuses
	 *
	 * Attempts to order statuses in a typical workflow order:
	 * To Do -> In Progress -> Review -> Done
	 *
	 * @param grouped - Object with status names as keys
	 * @returns Array of status names in logical order
	 */
	private getStatusOrder(grouped: Record<string, JiraIssue[]>): string[] {
		const statuses = Object.keys(grouped);

		// Define typical status order patterns
		const orderPatterns = [
			/^(to do|todo|backlog|open|new)$/i,
			/^(in progress|in dev|development)$/i,
			/^(in review|review|code review|peer review)$/i,
			/^(testing|qa|in testing)$/i,
			/^(done|closed|resolved|complete)$/i
		];

		// Separate statuses into ordered and unordered groups
		const ordered: string[] = [];
		const unordered: string[] = [];

		for (const status of statuses) {
			let matched = false;
			for (let i = 0; i < orderPatterns.length; i++) {
				if (orderPatterns[i].test(status)) {
					ordered[i] = status;
					matched = true;
					break;
				}
			}
			if (!matched) {
				unordered.push(status);
			}
		}

		// Combine ordered (removing undefined) with unordered (alphabetically sorted)
		return [
			...ordered.filter(s => s !== undefined),
			...unordered.sort()
		];
	}
}
