// Jira API Type Definitions

export interface JiraUser {
  accountId: string;
  accountType?: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: {
    '16x16': string;
    '24x24': string;
    '32x32': string;
    '48x48': string;
  };
  active?: boolean;
  timeZone?: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  description?: string;
  statusCategory: {
    id: number;
    key: string;
    colorName: string;
    name: string;
  };
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  subtask: boolean;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  avatarUrls?: {
    '16x16': string;
    '24x24': string;
    '32x32': string;
    '48x48': string;
  };
  lead?: JiraUser;
  issueTypes?: JiraIssueType[];
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'future' | 'active' | 'closed';
  startDate?: string;
  endDate?: string;
  completeDate?: string;
}

export interface JiraAttachment {
  id: string;
  filename: string;
  author: JiraUser;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}

export interface JiraComment {
  id: string;
  author: JiraUser;
  body: any; // ADF (Atlassian Document Format)
  created: string;
  updated: string;
}

export interface JiraIssueLink {
  id: string;
  type: {
    id: string;
    name: string;
    inward: string;
    outward: string;
  };
  inwardIssue?: JiraIssue;
  outwardIssue?: JiraIssue;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
  hasScreen?: boolean;
  isGlobal?: boolean;
  isInitial?: boolean;
  isConditional?: boolean;
}

export interface JiraIssueFields {
  summary: string;
  description?: any; // ADF format
  status: JiraStatus;
  priority: JiraPriority;
  issuetype: JiraIssueType;
  project: JiraProject;
  assignee?: JiraUser;
  reporter: JiraUser;
  created: string;
  updated: string;
  resolutiondate?: string;
  labels?: string[];
  components?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  fixVersions?: Array<{
    id: string;
    name: string;
    description?: string;
    released: boolean;
    releaseDate?: string;
  }>;
  parent?: JiraIssue;
  subtasks?: JiraIssue[];
  issuelinks?: JiraIssueLink[];
  attachment?: JiraAttachment[];
  comment?: {
    comments: JiraComment[];
    maxResults: number;
    total: number;
    startAt: number;
  };
  sprint?: JiraSprint;
  customfield_10016?: JiraSprint[]; // Sprint field (may vary by Jira instance)
  [key: string]: any; // Allow for custom fields
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

export interface JiraIssueDetails extends JiraIssue {
  renderedFields?: {
    description?: string;
    [key: string]: any;
  };
  names?: Record<string, string>;
  schema?: Record<string, any>;
  transitions?: JiraTransition[];
  changelog?: {
    startAt: number;
    maxResults: number;
    total: number;
    histories: Array<{
      id: string;
      author: JiraUser;
      created: string;
      items: Array<{
        field: string;
        fieldtype: string;
        from: string;
        fromString: string;
        to: string;
        toString: string;
      }>;
    }>;
  };
}

/**
 * Response from the enhanced JQL search endpoint (GET/POST /rest/api/2/search/jql)
 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-search/#api-rest-api-2-search-jql-get
 */
export interface JiraSearchResponse {
  issues: JiraIssue[];
  nextPageToken?: string;
  isLast?: boolean;
  /** @deprecated Provided for backward compatibility; may not be present in new endpoint responses */
  expand?: string;
  /** @deprecated Use nextPageToken-based pagination instead */
  startAt?: number;
  /** @deprecated Use nextPageToken-based pagination instead */
  maxResults?: number;
  /** @deprecated May not be available in new endpoint; use /search/approximate-count if needed */
  total?: number;
}

export interface CreateIssueRequest {
  projectKey: string;
  summary: string;
  description?: string;
  issueType: string;
  priority?: string;
  assignee?: string;
  reporter?: string;
  labels?: string[];
  parentKey?: string; // For subtasks
  customFields?: Record<string, any>;
}

export interface CreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

export interface JiraCredentials {
  url: string;
  email: string;
  token: string;
}

export interface JiraCreateMetadata {
  projects: Array<{
    id: string;
    key: string;
    name: string;
    issuetypes: Array<{
      id: string;
      name: string;
      description: string;
      subtask: boolean;
      fields: Record<string, {
        required: boolean;
        schema: any;
        name: string;
        key: string;
        allowedValues?: any[];
        operations?: string[];
        hasDefaultValue?: boolean;
        defaultValue?: any;
      }>;
    }>;
  }>;
}

export interface JiraAPIError {
  message: string;
  statusCode: number;
  response?: any;
}

/**
 * Full issue context for Copilot investigation
 * Contains all relevant data for understanding an issue
 */
export interface IssueContext {
  issue: JiraIssueDetails;
  acceptanceCriteria: string | null;
  comments: JiraComment[];
  related: JiraIssue[];
  attachments: JiraAttachment[];
}
