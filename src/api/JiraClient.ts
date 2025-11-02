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
