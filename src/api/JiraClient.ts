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

  /**
   * Creates a new JiraClient instance
   *
   * @param instanceUrl - The Jira instance URL (e.g., https://company.atlassian.net)
   * @param email - User's email address
   * @param apiToken - Jira API token from https://id.atlassian.com/manage-profile/security/api-tokens
   */
  constructor(instanceUrl: string, email: string, apiToken: string) {
    // Ensure instanceUrl doesn't have trailing slash
    this.baseUrl = `${instanceUrl.replace(/\/$/, '')}/rest/api/2`;

    // Create Base64 encoded auth string
    const authString = Buffer.from(`${email}:${apiToken}`).toString('base64');

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
          const message = error.response.data?.errorMessages?.[0] ||
                         error.response.data?.message ||
                         error.message;

          throw new JiraAPIError(
            message,
            error.response.status,
            error.response.data
          );
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
   * Generic request method
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
   * @returns Promise with array of JiraIssue objects
   */
  async getAssignedIssues(options?: {
    maxResults?: number;
    startAt?: number;
    fields?: string[];
  }): Promise<JiraIssue[]> {
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
   * @returns Promise with detailed JiraIssueDetails object
   * @throws JiraNotFoundError if the issue doesn't exist
   * @throws JiraAuthenticationError if authentication fails
   */
  async getIssueDetails(issueKey: string): Promise<JiraIssueDetails> {
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

      // Fetch and return the full issue details
      return await this.getIssueDetails(response.key);
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
   * @returns Promise with array of available JiraTransition objects
   * @throws JiraNotFoundError if the issue doesn't exist
   * @throws JiraAuthenticationError if authentication fails
   */
  async getAvailableTransitions(issueKey: string): Promise<JiraTransition[]> {
    try {
      const response = await this.request<{ transitions: JiraTransition[] }>(
        'GET',
        `/issue/${issueKey}/transitions`
      );
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
