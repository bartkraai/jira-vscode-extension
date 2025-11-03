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
 * Tree item representing a loading state
 */
export class LoadingItem extends vscode.TreeItem {
	public readonly type = 'loading';

	constructor() {
		super('Loading...', vscode.TreeItemCollapsibleState.None);
		this.contextValue = 'loading';
		this.iconPath = new vscode.ThemeIcon('sync~spin');
	}
}

/**
 * Tree item representing an error state
 */
export class ErrorItem extends vscode.TreeItem {
	public readonly type = 'error';

	constructor(message: string) {
		super(`Error: ${message}`, vscode.TreeItemCollapsibleState.None);
		this.contextValue = 'error';
		this.iconPath = new vscode.ThemeIcon('error');
		this.tooltip = message;
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
export type TreeItem = StatusGroupItem | IssueItem | LoadingItem | ErrorItem;

/**
 * Tree data provider for displaying Jira issues in the VS Code sidebar
 *
 * This provider organizes issues by status (To Do, In Progress, Done, etc.)
 * and displays them in a hierarchical tree view.
 */
export class JiraTreeProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private refreshTimer?: NodeJS.Timeout;
	private lastRefreshTime?: Date;
	private isLoading: boolean = false;

	/**
	 * Filter state for issues
	 */
	private filters = {
		issueTypes: new Set<string>(),
		priorities: new Set<string>(),
		sprints: new Set<string>(),
		searchText: ''
	};

	constructor(
		private context: vscode.ExtensionContext,
		private authManager: AuthManager,
		private configManager: ConfigManager,
		private cacheManager: CacheManager
	) {
		// Load saved filters from workspace state
		this.loadFilters();
	}

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
	 * This triggers a reload of all data from Jira.
	 * Prevents multiple simultaneous refreshes by checking loading state.
	 */
	refresh(): void {
		// Prevent multiple simultaneous refreshes
		if (this.isLoading) {
			return;
		}

		this.lastRefreshTime = new Date();
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
		// Show loading indicator at root level only
		if (!element && this.isLoading) {
			return [new LoadingItem()];
		}

		// Don't show loading states for children (status groups, loading, error items)
		if (element && (element.type === 'loading' || element.type === 'error')) {
			return [];
		}

		// Set loading state when fetching root data
		if (!element) {
			this.isLoading = true;
		}

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
				const result = await this.getStatusGroups(client);
				return result;
			} else if (element.type === 'statusGroup') {
				// Return issues for this status
				return await this.getIssuesForStatus(client, (element as StatusGroupItem).status);
			}
			return [];
		} catch (error) {
			// If there's an error fetching data, show an error item
			const errorMessage = error instanceof Error ? error.message : String(error);

			// Also show a notification for root-level errors
			if (!element) {
				vscode.window.showErrorMessage(
					`Failed to fetch Jira issues: ${errorMessage}`
				);
				return [new ErrorItem(errorMessage)];
			}

			// For child elements, just return empty array
			return [];
		} finally {
			// Clear loading state when done
			if (!element) {
				this.isLoading = false;
			}
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

		// Apply filters before grouping
		const filteredIssues = this.applyFilters(issues);

		// Handle case where all issues are filtered out
		if (filteredIssues.length === 0) {
			return [];
		}

		const grouped = this.groupByStatus(filteredIssues);

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
		const filteredIssues = this.applyFilters(issues);
		return filteredIssues
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

	// ==================== Auto-Refresh Methods ====================

	/**
	 * Start automatic refresh on configured interval
	 *
	 * Checks the autoRefreshInterval configuration and starts a timer
	 * to automatically refresh the tree view at the specified interval.
	 * If interval is 0, auto-refresh is disabled.
	 */
	startAutoRefresh(): void {
		// Stop any existing timer first
		this.stopAutoRefresh();

		const interval = this.configManager.autoRefreshInterval;

		// If interval is 0, auto-refresh is disabled
		if (interval <= 0) {
			return;
		}

		// Start the refresh timer
		this.refreshTimer = setInterval(() => {
			this.refresh();
		}, interval * 1000); // Convert seconds to milliseconds
	}

	/**
	 * Stop automatic refresh
	 *
	 * Clears the auto-refresh timer if one is running.
	 * Safe to call even if no timer is active.
	 */
	stopAutoRefresh(): void {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = undefined;
		}
	}

	/**
	 * Update the auto-refresh interval
	 *
	 * Called when the configuration changes to restart auto-refresh
	 * with the new interval. This stops the current timer and starts
	 * a new one with the updated configuration.
	 */
	updateRefreshInterval(): void {
		this.startAutoRefresh(); // This will stop existing timer and start new one
	}

	/**
	 * Get the last refresh time
	 *
	 * @returns The date/time of the last refresh, or undefined if never refreshed
	 */
	getLastRefreshTime(): Date | undefined {
		return this.lastRefreshTime;
	}

	// ==================== Filter Methods ====================

	/**
	 * Load saved filters from workspace state
	 *
	 * Restores filter state from the workspace storage, allowing filters
	 * to persist across VS Code sessions.
	 */
	private loadFilters(): void {
		try {
			const saved = this.context.workspaceState.get<{
				issueTypes: string[];
				priorities: string[];
				sprints: string[];
				searchText?: string;
			}>('jira.filters');

			if (saved) {
				this.filters.issueTypes = new Set(saved.issueTypes || []);
				this.filters.priorities = new Set(saved.priorities || []);
				this.filters.sprints = new Set(saved.sprints || []);
				this.filters.searchText = saved.searchText || '';
			}
		} catch (error) {
			// If loading fails, just use default empty filters
			console.error('Failed to load saved filters:', error);
		}
	}

	/**
	 * Save current filter state to workspace state
	 *
	 * Persists the current filter settings so they can be restored
	 * when VS Code is reopened.
	 */
	private async saveFilters(): Promise<void> {
		try {
			await this.context.workspaceState.update('jira.filters', {
				issueTypes: Array.from(this.filters.issueTypes),
				priorities: Array.from(this.filters.priorities),
				sprints: Array.from(this.filters.sprints),
				searchText: this.filters.searchText
			});
		} catch (error) {
			// Saving filters is not critical, just log the error
			console.error('Failed to save filters:', error);
		}
	}

	/**
	 * Apply filters to issues
	 *
	 * Filters issues based on the current filter state (issue types, priorities, sprints, search text)
	 *
	 * @param issues - Array of issues to filter
	 * @returns Filtered array of issues
	 */
	private applyFilters(issues: JiraIssue[]): JiraIssue[] {
		return issues.filter(issue => {
			// Filter by issue type
			if (this.filters.issueTypes.size > 0 &&
				!this.filters.issueTypes.has(issue.fields.issuetype.name)) {
				return false;
			}

			// Filter by priority
			if (this.filters.priorities.size > 0 &&
				!this.filters.priorities.has(issue.fields.priority.name)) {
				return false;
			}

			// Filter by sprint
			if (this.filters.sprints.size > 0) {
				// Get sprint information from issue
				// Sprint can be in either 'sprint' or 'customfield_10016' fields
				const sprint = issue.fields.sprint || issue.fields.customfield_10016;

				// Handle issues with no sprint
				if (!sprint || (Array.isArray(sprint) && sprint.length === 0)) {
					// Issue has no sprint - check if NO_SPRINT filter is active
					if (!this.filters.sprints.has('NO_SPRINT')) {
						return false;
					}
				} else {
					// Issue has sprint(s) - check if any match the filter
					const issueSprints = Array.isArray(sprint) ? sprint : [sprint];
					const issueSprintIds = issueSprints.map((s: any) => s.id?.toString() || 'NO_SPRINT');

					// Check if any of the issue's sprints match the filter
					const hasMatchingSprint = issueSprintIds.some(
						(sprintId: string) => this.filters.sprints.has(sprintId)
					);

					if (!hasMatchingSprint) {
						return false;
					}
				}
			}

			// Filter by search text
			if (this.filters.searchText) {
				const searchLower = this.filters.searchText.toLowerCase();

				// Search in issue key
				if (issue.key.toLowerCase().includes(searchLower)) {
					return true;
				}

				// Search in summary
				if (issue.fields.summary.toLowerCase().includes(searchLower)) {
					return true;
				}

				// Search in description (if available)
				if (issue.fields.description) {
					// Handle ADF format description
					const descText = this.extractTextFromADF(issue.fields.description);
					if (descText.toLowerCase().includes(searchLower)) {
						return true;
					}
				}

				// No match found
				return false;
			}

			return true;
		});
	}

	/**
	 * Extract plain text from Atlassian Document Format (ADF)
	 *
	 * @param adf - The ADF object or plain string
	 * @returns Plain text extracted from the ADF
	 */
	private extractTextFromADF(adf: any): string {
		if (typeof adf === 'string') {
			return adf;
		}

		if (!adf || typeof adf !== 'object') {
			return '';
		}

		let text = '';

		// If it's an ADF document with content array
		if (Array.isArray(adf.content)) {
			for (const node of adf.content) {
				text += this.extractTextFromADF(node) + ' ';
			}
		}

		// If it's a text node
		if (adf.type === 'text' && adf.text) {
			text += adf.text + ' ';
		}

		// Recursively process nested content
		if (Array.isArray(adf.content)) {
			for (const node of adf.content) {
				text += this.extractTextFromADF(node) + ' ';
			}
		}

		return text.trim();
	}

	/**
	 * Show quick pick to filter by issue type
	 *
	 * Allows user to select multiple issue types to show.
	 * If no types are selected, all types are shown.
	 */
	async filterByIssueType(): Promise<void> {
		// Define common issue types
		const allTypes = ['Bug', 'Story', 'Task', 'Epic', 'Subtask', 'Sub-task'];

		// Show multi-select quick pick
		const selected = await vscode.window.showQuickPick(allTypes, {
			canPickMany: true,
			placeHolder: 'Select issue types to show (or cancel to show all)',
			title: 'Filter by Issue Type'
		});

		// If user cancelled, don't change filters
		if (selected === undefined) {
			return;
		}

		// Update filter state
		this.filters.issueTypes = new Set(selected);

		// Save filter state
		await this.saveFilters();

		// Show status message
		if (selected.length === 0) {
			vscode.window.showInformationMessage('Showing all issue types');
		} else {
			vscode.window.showInformationMessage(`Filtering: ${selected.join(', ')}`);
		}

		// Refresh tree view
		this.refresh();
	}

	/**
	 * Show quick pick to filter by priority
	 *
	 * Allows user to select multiple priorities to show.
	 * If no priorities are selected, all priorities are shown.
	 */
	async filterByPriority(): Promise<void> {
		// Define standard Jira priorities
		const allPriorities = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

		// Show multi-select quick pick
		const selected = await vscode.window.showQuickPick(allPriorities, {
			canPickMany: true,
			placeHolder: 'Select priorities to show (or cancel to show all)',
			title: 'Filter by Priority'
		});

		// If user cancelled, don't change filters
		if (selected === undefined) {
			return;
		}

		// Update filter state
		this.filters.priorities = new Set(selected);

		// Save filter state
		await this.saveFilters();

		// Show status message
		if (selected.length === 0) {
			vscode.window.showInformationMessage('Showing all priorities');
		} else {
			vscode.window.showInformationMessage(`Filtering: ${selected.join(', ')}`);
		}

		// Refresh tree view
		this.refresh();
	}

	/**
	 * Show quick pick to filter by sprint
	 *
	 * Allows user to select multiple sprints to show.
	 * If no sprints are selected, all sprints are shown.
	 * Includes an option to show issues without a sprint.
	 */
	async filterBySprint(): Promise<void> {
		try {
			// Get Jira client
			const client = await this.getJiraClient();
			if (!client) {
				vscode.window.showErrorMessage('Please configure Jira credentials first');
				return;
			}

			// Fetch available sprints
			const sprints = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Fetching sprints...',
					cancellable: false
				},
				async () => {
					return await client.getSprints();
				}
			);

			if (sprints.length === 0) {
				vscode.window.showInformationMessage('No active or future sprints found');
				return;
			}

			// Create quick pick items from sprints
			interface SprintQuickPickItem extends vscode.QuickPickItem {
				sprintId: string | null;
			}

			const sprintItems: SprintQuickPickItem[] = sprints.map(sprint => ({
				label: sprint.name,
				description: sprint.state === 'active' ? '$(sync~spin) Active' : '$(calendar) Future',
				sprintId: sprint.id.toString()
			}));

			// Add option to show issues without sprint
			sprintItems.push({
				label: '(No Sprint)',
				description: 'Issues not assigned to any sprint',
				sprintId: null
			});

			// Show multi-select quick pick
			const selected = await vscode.window.showQuickPick(sprintItems, {
				canPickMany: true,
				placeHolder: 'Select sprints to show (or cancel to show all)',
				title: 'Filter by Sprint'
			});

			// If user cancelled, don't change filters
			if (selected === undefined) {
				return;
			}

			// Update filter state
			this.filters.sprints = new Set(selected.map(item => item.sprintId || 'NO_SPRINT'));

			// Save filter state
			await this.saveFilters();

			// Show status message
			if (selected.length === 0) {
				vscode.window.showInformationMessage('Showing all sprints');
			} else {
				const sprintNames = selected.map(item => item.label).join(', ');
				vscode.window.showInformationMessage(`Filtering: ${sprintNames}`);
			}

			// Refresh tree view
			this.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to fetch sprints: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Show input box to search/filter issues
	 *
	 * Allows user to enter text to filter issues by key, summary, or description.
	 * Search is case-insensitive and updates in real-time.
	 */
	async searchIssues(): Promise<void> {
		const searchText = await vscode.window.showInputBox({
			prompt: 'Search issues by key, summary, or description',
			placeHolder: 'Enter search text...',
			value: this.filters.searchText,
			validateInput: (value) => {
				// No validation - empty string is valid (clears search)
				return null;
			}
		});

		// If user cancelled, don't change search
		if (searchText === undefined) {
			return;
		}

		// Update search filter
		this.filters.searchText = searchText.trim();

		// Save filter state
		await this.saveFilters();

		// Show status message
		if (this.filters.searchText) {
			vscode.window.showInformationMessage(`Searching for: "${this.filters.searchText}"`);
		} else {
			vscode.window.showInformationMessage('Search cleared');
		}

		// Refresh tree view
		this.refresh();
	}

	/**
	 * Clear the search filter
	 *
	 * Removes the search text filter and refreshes the tree view.
	 */
	async clearSearch(): Promise<void> {
		if (!this.filters.searchText) {
			vscode.window.showInformationMessage('No active search to clear');
			return;
		}

		this.filters.searchText = '';

		// Save filter state
		await this.saveFilters();

		vscode.window.showInformationMessage('Search cleared');
		this.refresh();
	}

	/**
	 * Clear all filters
	 *
	 * Resets all filter state and refreshes the tree view to show all issues.
	 * Also clears the saved filter state from workspace storage.
	 */
	async clearFilters(): Promise<void> {
		this.filters.issueTypes.clear();
		this.filters.priorities.clear();
		this.filters.sprints.clear();
		this.filters.searchText = '';

		// Clear saved filters
		await this.saveFilters();

		vscode.window.showInformationMessage('All filters cleared');
		this.refresh();
	}

	/**
	 * Check if any filters are active
	 *
	 * @returns True if any filter is currently active
	 */
	hasActiveFilters(): boolean {
		return this.filters.issueTypes.size > 0 ||
			this.filters.priorities.size > 0 ||
			this.filters.sprints.size > 0 ||
			this.filters.searchText.length > 0;
	}
}
