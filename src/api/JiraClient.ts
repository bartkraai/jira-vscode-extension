import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
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
  JiraCreateMetadata
} from '../models/jira';
import { CacheManager, CacheTTL } from './CacheManager';

/**
 * Jira API Client
 *
 * Handles all communication with Jira REST API v2.
 * Uses Basic Authentication with email and API token.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v2/intro/
 */
export class JiraClient {
  private baseUrl: string;
  private httpClient: AxiosInstance;
  private cache: CacheManager;

  /**
   * Creates a new JiraClient instance
   *
   * @param instanceUrl - The Jira instance URL (e.g., https://company.atlassian.net)
   * @param email - User's email address
   * @param apiToken - Jira API token from https://id.atlassian.com/manage-profile/security/api-tokens
   * @param cacheManager - Optional CacheManager instance (creates new one if not provided)
   */
  constructor(instanceUrl: string, email: string, apiToken: string, cacheManager?: CacheManager) {
    // Ensure instanceUrl doesn't have trailing slash
    this.baseUrl = `${instanceUrl.replace(/\/$/, '')}/rest/api/2`;

    // Create Base64 encoded auth string
    const authString = Buffer.from(`${email}:${apiToken}`).toString('base64');

    // Initialize cache manager
    this.cache = cacheManager || new CacheManager();

    // Configure HTTP client
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          const statusCode = error.response.status;
          const message = error.response.data?.errorMessages?.[0] ||
                         error.response.data?.message ||
                         error.message;

          // Handle specific status codes with custom error types
          switch (statusCode) {
            case 401:
              throw new JiraAuthenticationError(message);
            case 403:
              throw new JiraPermissionError(message);
            case 404:
              throw new JiraNotFoundError(message);
            case 429:
              throw new JiraRateLimitError(message);
            default:
              throw new JiraAPIError(message, statusCode, error.response.data);
          }
        } else if (error.request) {
          // The request was made but no response was received
          throw new JiraAPIError(
            'No response received from Jira. Please check your network connection.',
            0
          );
        } else {
          // Something happened in setting up the request that triggered an Error
          throw new JiraAPIError(error.message, 0);
        }
      }
    );
  }

  /**
   * Determine if an error is retryable
   *
   * @param error - The error to check
   * @returns true if the error is retryable, false otherwise
   */
  private isRetryable(error: any): boolean {
    // Retry on rate limit errors (429)
    if (error instanceof JiraRateLimitError) {
      return true;
    }

    // Retry on server errors (500, 502, 503)
    if (error instanceof JiraAPIError) {
      const retryableStatusCodes = [500, 502, 503];
      return retryableStatusCodes.includes(error.statusCode);
    }

    // Retry on network errors (no response)
    if (error instanceof JiraAPIError && error.statusCode === 0) {
      return true;
    }

    return false;
  }

  /**
   * Delay execution for a specified number of milliseconds
   *
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a request with exponential backoff
   *
   * @param fn - The function to retry
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns Promise with the result of the function
   * @throws The last error if all retries fail
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on non-retryable errors
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries - 1) {
          throw error;
        }

        // Calculate backoff delay: 1s, 2s, 4s, 8s, etc.
        const backoffDelay = Math.pow(2, attempt) * 1000;

        // For rate limit errors, use Retry-After header if available
        let delayMs = backoffDelay;
        if (error instanceof JiraRateLimitError && error.response?.headers?.['retry-after']) {
          const retryAfter = parseInt(error.response.headers['retry-after'], 10);
          if (!isNaN(retryAfter)) {
            delayMs = retryAfter * 1000; // Convert seconds to milliseconds
          }
        }

        // Wait before retrying
        await this.delay(delayMs);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
  }

  /**
   * Generic request method with automatic retry logic
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE)
   * @param endpoint - API endpoint (relative to base URL)
   * @param data - Request data (for POST/PUT)
   * @param config - Additional axios config
   * @returns Promise with response data
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    // Wrap the actual request in retry logic
    return this.retryRequest(async () => {
      const requestConfig: AxiosRequestConfig = {
        method,
        url: endpoint,
        ...config
      };

      if (data) {
        if (method === 'GET') {
          requestConfig.params = data;
        } else {
          requestConfig.data = data;
        }
      }

      const response: AxiosResponse<T> = await this.httpClient.request(requestConfig);
      return response.data;
    });
  }

  /**
   * Get the cache manager instance
   *
   * @returns CacheManager instance
   */
  getCache(): CacheManager {
    return this.cache;
  }

  /**
   * Test connection to Jira
   *
   * @returns Promise that resolves if connection is successful
   * @throws JiraAPIError if connection fails
   */
  async testConnection(): Promise<void> {
    try {
      await this.request('GET', '/myself');
    } catch (error) {
      if (error instanceof JiraAPIError && error.statusCode === 401) {
        throw new JiraAuthenticationError('Invalid credentials. Please check your email and API token.');
      }
      throw error;
    }
  }

  /**
   * Get current user information
   *
   * @returns Promise with user data
   */
  async getCurrentUser(): Promise<any> {
    return this.request('GET', '/myself');
  }

  /**
   * Fetch all issues assigned to the current user
   *
   * @param options - Optional query parameters
   * @param options.maxResults - Maximum number of issues to return (default: 100)
   * @param options.startAt - Starting index for pagination (default: 0)
   * @param options.fields - Array of field names to include (default: all common fields)
   * @param options.useCache - Whether to use cached results (default: true)
   * @returns Promise with array of JiraIssue objects
   */
  async getAssignedIssues(options?: {
    maxResults?: number;
    startAt?: number;
    fields?: string[];
    useCache?: boolean;
  }): Promise<JiraIssue[]> {
    const useCache = options?.useCache !== false;

    // Generate cache key based on parameters
    const cacheKey = `assignedIssues:${options?.maxResults || 100}:${options?.startAt || 0}`;

    // Check cache first
    if (useCache) {
      const cached = this.cache.get<JiraIssue[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const jql = 'assignee = currentUser() ORDER BY updated DESC';

    const defaultFields = [
      'summary',
      'status',
      'priority',
      'issuetype',
      'updated',
      'created',
      'assignee',
      'reporter',
      'description',
      'parent',
      'sprint',
      'customfield_10016' // Sprint field (may vary by instance)
    ];

    const params = {
      jql,
      maxResults: options?.maxResults || 100,
      startAt: options?.startAt || 0,
      fields: options?.fields || defaultFields
    };

    try {
      const response = await this.request<JiraSearchResponse>('GET', '/search', params);

      // Cache the results
      this.cache.set(cacheKey, response.issues, CacheTTL.ASSIGNED_ISSUES);

      return response.issues;
    } catch (error) {
      if (error instanceof JiraAPIError && error.statusCode === 401) {
        throw new JiraAuthenticationError('Authentication failed while fetching issues. Please verify your credentials.');
      }
      throw error;
    }
  }

  /**
   * Fetch full details of a specific issue
   *
   * @param issueKey - The Jira issue key (e.g., 'PROJ-123')
   * @param useCache - Whether to use cached results (default: true)
   * @returns Promise with detailed JiraIssueDetails object
   * @throws JiraNotFoundError if the issue doesn't exist
   * @throws JiraAuthenticationError if authentication fails
   */
  async getIssueDetails(issueKey: string, useCache: boolean = true): Promise<JiraIssueDetails> {
    const cacheKey = `issueDetails:${issueKey}`;

    // Check cache first
    if (useCache) {
      const cached = this.cache.get<JiraIssueDetails>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const params = {
      fields: '*all',
      expand: 'renderedFields,names,schema,transitions,changelog,comments'
    };

    try {
      const response = await this.request<JiraIssueDetails>(
        'GET',
        `/issue/${issueKey}`,
        params
      );

      // Cache the results
      this.cache.set(cacheKey, response, CacheTTL.ISSUE_DETAILS);

      return response;
    } catch (error) {
      if (error instanceof JiraAPIError) {
        if (error.statusCode === 404) {
          throw new JiraNotFoundError(`Issue '${issueKey}' not found. Please verify the issue key.`);
        } else if (error.statusCode === 401) {
          throw new JiraAuthenticationError('Authentication failed while fetching issue details. Please verify your credentials.');
        }
      }
      throw error;
    }
  }

  /**
   * Create a new Jira issue
   *
   * @param issueData - Issue creation data
   * @returns Promise with created issue details
   * @throws JiraAPIError if creation fails
   * @throws JiraAuthenticationError if authentication fails
   */
  async createIssue(issueData: CreateIssueRequest): Promise<JiraIssue> {
    // Validate required fields
    if (!issueData.projectKey) {
      throw new JiraAPIError('Project key is required', 400);
    }
    if (!issueData.summary) {
      throw new JiraAPIError('Summary is required', 400);
    }
    if (!issueData.issueType) {
      throw new JiraAPIError('Issue type is required', 400);
    }

    // Build the request payload
    const payload: any = {
      fields: {
        project: { key: issueData.projectKey },
        summary: issueData.summary,
        issuetype: { name: issueData.issueType }
      }
    };

    // Add description if provided (convert to ADF format)
    if (issueData.description) {
      payload.fields.description = this.convertTextToADF(issueData.description);
    }

    // Add priority if provided
    if (issueData.priority) {
      payload.fields.priority = { name: issueData.priority };
    }

    // Add assignee if provided
    if (issueData.assignee) {
      payload.fields.assignee = { accountId: issueData.assignee };
    }

    // Add reporter if provided
    if (issueData.reporter) {
      payload.fields.reporter = { accountId: issueData.reporter };
    }

    // Add labels if provided
    if (issueData.labels && issueData.labels.length > 0) {
      payload.fields.labels = issueData.labels;
    }

    // Add parent if this is a subtask
    if (issueData.parentKey) {
      payload.fields.parent = { key: issueData.parentKey };
    }

    // Add any custom fields
    if (issueData.customFields) {
      Object.assign(payload.fields, issueData.customFields);
    }

    try {
      // Create the issue
      const response = await this.request<CreateIssueResponse>(
        'POST',
        '/issue',
        payload
      );

      // Invalidate assigned issues cache since a new issue was created
      this.cache.invalidate('assignedIssues:*');

      // Fetch and return the full issue details
      return await this.getIssueDetails(response.key, false); // Don't use cache for newly created issue
    } catch (error) {
      if (error instanceof JiraAPIError) {
        if (error.statusCode === 401) {
          throw new JiraAuthenticationError('Authentication failed while creating issue. Please verify your credentials.');
        } else if (error.statusCode === 400) {
          // Extract field validation errors if available
          const fieldErrors = error.response?.errors;
          if (fieldErrors) {
            const errorMessages = Object.entries(fieldErrors)
              .map(([field, message]) => `${field}: ${message}`)
              .join(', ');
            throw new JiraAPIError(`Field validation failed: ${errorMessages}`, 400, error.response);
          }
        }
      }
      throw error;
    }
  }

  /**
   * Get available transitions (status changes) for an issue
   *
   * @param issueKey - The Jira issue key (e.g., 'PROJ-123')
   * @param useCache - Whether to use cached results (default: true)
   * @returns Promise with array of available JiraTransition objects
   * @throws JiraNotFoundError if the issue doesn't exist
   * @throws JiraAuthenticationError if authentication fails
   */
  async getAvailableTransitions(issueKey: string, useCache: boolean = true): Promise<JiraTransition[]> {
    const cacheKey = `transitions:${issueKey}`;

    // Check cache first
    if (useCache) {
      const cached = this.cache.get<JiraTransition[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.request<{ transitions: JiraTransition[] }>(
        'GET',
        `/issue/${issueKey}/transitions`
      );

      // Cache the results
      this.cache.set(cacheKey, response.transitions, CacheTTL.TRANSITIONS);

      return response.transitions;
    } catch (error) {
      if (error instanceof JiraAPIError) {
        if (error.statusCode === 404) {
          throw new JiraNotFoundError(`Issue '${issueKey}' not found. Please verify the issue key.`);
        } else if (error.statusCode === 401) {
          throw new JiraAuthenticationError('Authentication failed while fetching transitions. Please verify your credentials.');
        }
      }
      throw error;
    }
  }

  /**
   * Transition an issue to a new status
   *
   * @param issueKey - The Jira issue key (e.g., 'PROJ-123')
   * @param transitionId - The ID of the transition to execute
   * @param comment - Optional comment to add during the transition
   * @returns Promise that resolves when transition is complete
   * @throws JiraNotFoundError if the issue doesn't exist
   * @throws JiraAuthenticationError if authentication fails
   * @throws JiraAPIError if the transition is invalid
   */
  async transitionIssue(
    issueKey: string,
    transitionId: string,
    comment?: string
  ): Promise<void> {
    const payload: any = {
      transition: { id: transitionId }
    };

    // Add comment if provided
    if (comment) {
      payload.update = {
        comment: [{
          add: {
            body: this.convertTextToADF(comment)
          }
        }]
      };
    }

    try {
      await this.request('POST', `/issue/${issueKey}/transitions`, payload);

      // Invalidate caches for this issue since it changed
      this.cache.invalidate(`issueDetails:${issueKey}`);
      this.cache.invalidate(`transitions:${issueKey}`);
      this.cache.invalidate('assignedIssues:*'); // Status changed, so list view may need update
    } catch (error) {
      if (error instanceof JiraAPIError) {
        if (error.statusCode === 404) {
          throw new JiraNotFoundError(`Issue '${issueKey}' not found. Please verify the issue key.`);
        } else if (error.statusCode === 401) {
          throw new JiraAuthenticationError('Authentication failed while transitioning issue. Please verify your credentials.');
        } else if (error.statusCode === 400) {
          throw new JiraAPIError(`Invalid transition. The transition '${transitionId}' may not be available for this issue.`, 400, error.response);
        }
      }
      throw error;
    }
  }

  /**
   * Add a comment to an issue
   *
   * @param issueKey - The Jira issue key (e.g., 'PROJ-123')
   * @param commentText - The comment text to add
   * @returns Promise with created JiraComment object
   * @throws JiraNotFoundError if the issue doesn't exist
   * @throws JiraAuthenticationError if authentication fails
   * @throws JiraAPIError if comment creation fails
   */
  async addComment(issueKey: string, commentText: string): Promise<JiraComment> {
    // Validate required fields
    if (!commentText || commentText.trim().length === 0) {
      throw new JiraAPIError('Comment text is required', 400);
    }

    // Build the request payload with ADF format
    const payload = {
      body: this.convertTextToADF(commentText)
    };

    try {
      const response = await this.request<JiraComment>(
        'POST',
        `/issue/${issueKey}/comment`,
        payload
      );

      // Invalidate issue details cache since a comment was added
      this.cache.invalidate(`issueDetails:${issueKey}`);

      return response;
    } catch (error) {
      if (error instanceof JiraAPIError) {
        if (error.statusCode === 404) {
          throw new JiraNotFoundError(`Issue '${issueKey}' not found. Please verify the issue key.`);
        } else if (error.statusCode === 401) {
          throw new JiraAuthenticationError('Authentication failed while adding comment. Please verify your credentials.');
        } else if (error.statusCode === 400) {
          throw new JiraAPIError(`Failed to add comment: ${error.message}`, 400, error.response);
        }
      }
      throw error;
    }
  }

  /**
   * Fetch all accessible projects for the current user
   *
   * @param useCache - Whether to use cached results (default: true)
   * @returns Promise with array of JiraProject objects
   * @throws JiraAuthenticationError if authentication fails
   */
  async getProjects(useCache: boolean = true): Promise<JiraProject[]> {
    const cacheKey = 'projects';

    // Check cache first
    if (useCache) {
      const cached = this.cache.get<JiraProject[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.request<JiraProject[]>('GET', '/project');

      // Cache the results
      this.cache.set(cacheKey, response, CacheTTL.PROJECTS);

      return response;
    } catch (error) {
      if (error instanceof JiraAPIError && error.statusCode === 401) {
        throw new JiraAuthenticationError('Authentication failed while fetching projects. Please verify your credentials.');
      }
      throw error;
    }
  }

  /**
   * Fetch issue types for a specific project
   *
   * @param projectKey - The project key (e.g., 'PROJ')
   * @param useCache - Whether to use cached results (default: true)
   * @returns Promise with array of JiraIssueType objects
   * @throws JiraNotFoundError if the project doesn't exist
   * @throws JiraAuthenticationError if authentication fails
   */
  async getIssueTypes(projectKey: string, useCache: boolean = true): Promise<JiraIssueType[]> {
    const cacheKey = `issueTypes:${projectKey}`;

    // Check cache first
    if (useCache) {
      const cached = this.cache.get<JiraIssueType[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.request<{ issueTypes: JiraIssueType[] }>(
        'GET',
        `/project/${projectKey}`
      );

      // Cache the results
      this.cache.set(cacheKey, response.issueTypes, CacheTTL.ISSUE_TYPES);

      return response.issueTypes;
    } catch (error) {
      if (error instanceof JiraAPIError) {
        if (error.statusCode === 404) {
          throw new JiraNotFoundError(`Project '${projectKey}' not found. Please verify the project key.`);
        } else if (error.statusCode === 401) {
          throw new JiraAuthenticationError('Authentication failed while fetching issue types. Please verify your credentials.');
        }
      }
      throw error;
    }
  }

  /**
   * Fetch create metadata for dynamic form building
   *
   * This endpoint returns detailed information about what fields are available,
   * required, and their allowed values when creating issues.
   *
   * @param projectKey - The project key (e.g., 'PROJ')
   * @param issueType - The issue type name (e.g., 'Bug', 'Story')
   * @param useCache - Whether to use cached results (default: true)
   * @returns Promise with JiraCreateMetadata object
   * @throws JiraNotFoundError if the project or issue type doesn't exist
   * @throws JiraAuthenticationError if authentication fails
   */
  async getCreateMetadata(projectKey: string, issueType: string, useCache: boolean = true): Promise<JiraCreateMetadata> {
    const cacheKey = `createMetadata:${projectKey}:${issueType}`;

    // Check cache first
    if (useCache) {
      const cached = this.cache.get<JiraCreateMetadata>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.request<JiraCreateMetadata>(
        'GET',
        '/issue/createmeta',
        {
          projectKeys: projectKey,
          issuetypeNames: issueType,
          expand: 'projects.issuetypes.fields'
        }
      );

      // Cache the results
      this.cache.set(cacheKey, response, CacheTTL.CREATE_METADATA);

      return response;
    } catch (error) {
      if (error instanceof JiraAPIError) {
        if (error.statusCode === 404) {
          throw new JiraNotFoundError(`Project '${projectKey}' or issue type '${issueType}' not found. Please verify the values.`);
        } else if (error.statusCode === 401) {
          throw new JiraAuthenticationError('Authentication failed while fetching create metadata. Please verify your credentials.');
        }
      }
      throw error;
    }
  }

  /**
   * Convert plain text to Atlassian Document Format (ADF)
   *
   * @param text - Plain text to convert
   * @returns ADF object
   */
  private convertTextToADF(text: string): any {
    // Split text into paragraphs (by double newlines or single newlines)
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    const content = paragraphs.map(paragraph => {
      // Handle single newlines within a paragraph as separate text nodes
      const lines = paragraph.split('\n').filter(l => l.trim().length > 0);

      if (lines.length === 0) {
        return {
          type: 'paragraph',
          content: [{ type: 'text', text: ' ' }]
        };
      }

      // Create content with hard breaks between lines
      const lineContent: any[] = [];
      lines.forEach((line, index) => {
        lineContent.push({ type: 'text', text: line });
        // Add hard break between lines (but not after the last line)
        if (index < lines.length - 1) {
          lineContent.push({ type: 'hardBreak' });
        }
      });

      return {
        type: 'paragraph',
        content: lineContent
      };
    });

    return {
      type: 'doc',
      version: 1,
      content
    };
  }
}

/**
 * Custom error class for Jira API errors
 */
export class JiraAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'JiraAPIError';
    Object.setPrototypeOf(this, JiraAPIError.prototype);
  }
}

/**
 * Authentication error class
 */
export class JiraAuthenticationError extends JiraAPIError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'JiraAuthenticationError';
    Object.setPrototypeOf(this, JiraAuthenticationError.prototype);
  }
}

/**
 * Permission error class
 */
export class JiraPermissionError extends JiraAPIError {
  constructor(message: string = 'Permission denied') {
    super(message, 403);
    this.name = 'JiraPermissionError';
    Object.setPrototypeOf(this, JiraPermissionError.prototype);
  }
}

/**
 * Not found error class
 */
export class JiraNotFoundError extends JiraAPIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'JiraNotFoundError';
    Object.setPrototypeOf(this, JiraNotFoundError.prototype);
  }
}

/**
 * Rate limit error class
 */
export class JiraRateLimitError extends JiraAPIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'JiraRateLimitError';
    Object.setPrototypeOf(this, JiraRateLimitError.prototype);
  }
}
