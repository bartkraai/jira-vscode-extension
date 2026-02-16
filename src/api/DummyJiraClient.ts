import {
  JiraIssue,
  JiraIssueDetails,
  JiraSearchResponse,
  CreateIssueRequest,
  CreateIssueResponse,
  JiraProject,
  JiraIssueType,
  JiraTransition,
  JiraComment,
  JiraCreateMetadata,
  IssueContext,
  JiraSprint
} from '../models/jira';
import { CacheManager } from './CacheManager';
import { DummyDataGenerator } from './DummyDataGenerator';

/**
 * Dummy Jira Client for testing UI without API access
 *
 * Implements the same interface as JiraClient but returns dummy data instead of making API calls.
 * Simulates realistic delays to mimic actual API behavior.
 */
export class DummyJiraClient {
  private cache: CacheManager;

  /**
   * Creates a new DummyJiraClient instance
   *
   * Note: Parameters are accepted for interface compatibility but not used
   */
  constructor(
    instanceUrl?: string,
    email?: string,
    apiToken?: string,
    cacheManager?: CacheManager
  ) {
    this.cache = cacheManager || new CacheManager();

    // Initialize dummy data
    DummyDataGenerator.initializeDummyIssues();
  }

  /**
   * Simulate network delay for realism
   */
  private async delay(ms: number = this.randomDelay()): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random delay between 100-500ms
   */
  private randomDelay(): number {
    return Math.floor(Math.random() * 400) + 100;
  }

  /**
   * Get the cache manager instance
   */
  getCache(): CacheManager {
    return this.cache;
  }

  /**
   * Test connection (always succeeds in dummy mode)
   */
  async testConnection(): Promise<void> {
    await this.delay(200);
    // Always succeeds in dummy mode
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<any> {
    await this.delay();
    return DummyDataGenerator.USERS[0]; // Return first user as "current user"
  }

  /**
   * Get assigned issues with filtering options
   */
  async getAssignedIssues(options?: {
    maxResults?: number;
    nextPageToken?: string;
    /** @deprecated Use nextPageToken instead */
    startAt?: number;
    jql?: string;
  }): Promise<JiraIssue[]> {
    await this.delay();

    const cacheKey = `assignedIssues:${JSON.stringify(options || {})}`;
    const cached = this.cache.get<JiraIssue[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all issues assigned to current user (user[0])
    let issues = DummyDataGenerator.getAllIssues();

    // Apply pagination (dummy client still uses simple offset for simulation)
    const startAt = options?.startAt || 0;
    const maxResults = options?.maxResults || 100;
    const paginatedIssues = issues.slice(startAt, startAt + maxResults);

    this.cache.set(cacheKey, paginatedIssues, 2 * 60 * 1000); // 2 minute TTL
    return paginatedIssues;
  }

  /**
   * Get detailed information about a specific issue
   */
  async getIssueDetails(issueKey: string, useCache: boolean = true): Promise<JiraIssueDetails> {
    await this.delay();

    const cacheKey = `issueDetails:${issueKey}`;
    if (useCache) {
      const cached = this.cache.get<JiraIssueDetails>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const details = DummyDataGenerator.getIssueDetails(issueKey);
    if (!details) {
      throw new Error(`Issue ${issueKey} not found`);
    }

    if (useCache) {
      this.cache.set(cacheKey, details, 5 * 60 * 1000); // 5 minute TTL
    }

    return details;
  }

  /**
   * Create a new issue
   */
  async createIssue(issueData: CreateIssueRequest): Promise<JiraIssue> {
    await this.delay(300); // Slightly longer delay for create operations

    // Invalidate cache
    this.cache.invalidate('assignedIssues:*');

    const response = DummyDataGenerator.createIssue(issueData);

    // Get the created issue
    const createdIssue = DummyDataGenerator.getIssueByKey(response.key);
    if (!createdIssue) {
      throw new Error('Failed to create issue');
    }

    return createdIssue;
  }

  /**
   * Get available status transitions for an issue
   */
  async getAvailableTransitions(issueKey: string, useCache: boolean = true): Promise<JiraTransition[]> {
    await this.delay();

    const cacheKey = `transitions:${issueKey}`;
    if (useCache) {
      const cached = this.cache.get<JiraTransition[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const transitions = DummyDataGenerator.getTransitions(issueKey);

    if (useCache) {
      this.cache.set(cacheKey, transitions, 5 * 60 * 1000); // 5 minute TTL
    }

    return transitions;
  }

  /**
   * Transition an issue to a new status
   */
  async transitionIssue(
    issueKey: string,
    transitionId: string,
    comment?: string,
    fields?: any
  ): Promise<void> {
    await this.delay(300);

    const success = DummyDataGenerator.transitionIssue(issueKey, transitionId);
    if (!success) {
      throw new Error(`Failed to transition issue ${issueKey}`);
    }

    // If comment provided, add it
    if (comment) {
      DummyDataGenerator.addComment(issueKey, comment);
    }

    // Invalidate relevant caches
    this.cache.invalidate(`issueDetails:${issueKey}`);
    this.cache.invalidate(`transitions:${issueKey}`);
    this.cache.invalidate('assignedIssues:*');
  }

  /**
   * Add a comment to an issue
   */
  async addComment(issueKey: string, commentText: string): Promise<JiraComment> {
    await this.delay(250);

    const comment = DummyDataGenerator.addComment(issueKey, commentText);

    // Invalidate issue details cache
    this.cache.invalidate(`issueDetails:${issueKey}`);

    return comment;
  }

  /**
   * Get all projects accessible to the user
   */
  async getProjects(useCache: boolean = true): Promise<JiraProject[]> {
    await this.delay();

    const cacheKey = 'projects';
    if (useCache) {
      const cached = this.cache.get<JiraProject[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const projects = DummyDataGenerator.PROJECTS;

    if (useCache) {
      this.cache.set(cacheKey, projects, 60 * 60 * 1000); // 1 hour TTL
    }

    return projects;
  }

  /**
   * Get issue types for a project
   */
  async getIssueTypes(projectKey: string, useCache: boolean = true): Promise<JiraIssueType[]> {
    await this.delay();

    const cacheKey = `issueTypes:${projectKey}`;
    if (useCache) {
      const cached = this.cache.get<JiraIssueType[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Filter out subtasks for main issue type list
    const issueTypes = DummyDataGenerator.ISSUE_TYPES.filter(t => !t.subtask);

    if (useCache) {
      this.cache.set(cacheKey, issueTypes, 60 * 60 * 1000); // 1 hour TTL
    }

    return issueTypes;
  }

  /**
   * Get sprints (active, future, and recent closed sprints)
   */
  async getSprints(useCache: boolean = true): Promise<JiraSprint[]> {
    await this.delay();

    const cacheKey = 'sprints';
    if (useCache) {
      const cached = this.cache.get<JiraSprint[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const sprints = DummyDataGenerator.SPRINTS;

    if (useCache) {
      this.cache.set(cacheKey, sprints, 15 * 60 * 1000); // 15 minute TTL
    }

    return sprints;
  }

  /**
   * Get create metadata for dynamic form generation
   */
  async getCreateMetadata(
    projectKey: string,
    issueType: string,
    useCache: boolean = true
  ): Promise<JiraCreateMetadata> {
    await this.delay();

    const cacheKey = `createMetadata:${projectKey}:${issueType}`;
    if (useCache) {
      const cached = this.cache.get<JiraCreateMetadata>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const metadata = DummyDataGenerator.getCreateMetadata(projectKey);

    if (useCache) {
      this.cache.set(cacheKey, metadata, 60 * 60 * 1000); // 1 hour TTL
    }

    return metadata;
  }

  /**
   * Get full issue context for Copilot integration
   */
  async getFullIssueContext(issueKey: string, useCache: boolean = true): Promise<IssueContext> {
    await this.delay();

    const cacheKey = `issueContext:${issueKey}`;
    if (useCache) {
      const cached = this.cache.get<IssueContext>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const details = await this.getIssueDetails(issueKey, useCache);

    // Build context object
    const context: IssueContext = {
      issue: details,
      acceptanceCriteria: this.extractAcceptanceCriteria(details),
      comments: details.fields.comment?.comments || [],
      related: [],
      attachments: details.fields.attachment || []
    };

    if (useCache) {
      this.cache.set(cacheKey, context, 5 * 60 * 1000); // 5 minute TTL
    }

    return context;
  }

  /**
   * Extract acceptance criteria from issue description
   */
  private extractAcceptanceCriteria(issue: JiraIssueDetails): string | null {
    const criteria: string[] = [];

    // Try to extract from rendered description
    if (issue.renderedFields?.description) {
      const lines = issue.renderedFields.description.split('\n');
      let inCriteriaSection = false;

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Look for acceptance criteria headers
        if (
          trimmedLine.toLowerCase().includes('acceptance criteria') ||
          trimmedLine.toLowerCase().includes('definition of done')
        ) {
          inCriteriaSection = true;
          continue;
        }

        // Look for next section header (if any)
        if (inCriteriaSection && trimmedLine.match(/^#{1,3}\s/)) {
          break;
        }

        // Collect bullet points or numbered items
        if (inCriteriaSection) {
          const match = trimmedLine.match(/^[-*\d.]+\s+(.+)/);
          if (match && match[1]) {
            criteria.push(match[1]);
          }
        }
      }
    }

    return criteria.length > 0 ? criteria.join('\n') : null;
  }

  /**
   * Generic request method (for interface compatibility)
   * Not used in dummy mode, but provided for compatibility
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    config?: any
  ): Promise<T> {
    await this.delay();
    throw new Error('Direct API requests are not supported in dummy data mode');
  }
}
