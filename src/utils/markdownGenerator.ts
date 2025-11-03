/**
 * Markdown generation utilities for Jira issues
 * Converts Jira issue context into well-formatted markdown for Copilot
 */

import { IssueContext, JiraComment, JiraAttachment } from '../models/jira';

/**
 * Convert Atlassian Document Format (ADF) to Markdown
 *
 * ADF is a JSON-based format used by Jira for rich text content.
 * This function converts common ADF structures to their markdown equivalents.
 *
 * @param adf - The ADF object to convert
 * @returns Markdown string representation
 */
export function convertADFToMarkdown(adf: any): string {
  if (!adf) {
    return '';
  }

  // Handle string content (legacy format or plain text)
  if (typeof adf === 'string') {
    return adf;
  }

  // Handle ADF document structure
  if (adf.type === 'doc' && adf.content) {
    return adf.content.map((node: any) => convertADFNode(node)).join('\n\n');
  }

  // If it's just a node, convert it directly
  return convertADFNode(adf);
}

/**
 * Convert a single ADF node to markdown
 */
function convertADFNode(node: any): string {
  if (!node || !node.type) {
    return '';
  }

  switch (node.type) {
    case 'paragraph':
      return convertParagraph(node);

    case 'heading':
      return convertHeading(node);

    case 'bulletList':
      return convertBulletList(node);

    case 'orderedList':
      return convertOrderedList(node);

    case 'codeBlock':
      return convertCodeBlock(node);

    case 'blockquote':
      return convertBlockquote(node);

    case 'rule':
      return '---';

    case 'hardBreak':
      return '\n';

    case 'text':
      return convertText(node);

    case 'mention':
      return convertMention(node);

    case 'emoji':
      return convertEmoji(node);

    case 'inlineCard':
    case 'blockCard':
      return convertCard(node);

    case 'mediaGroup':
    case 'mediaSingle':
      return convertMedia(node);

    case 'table':
      return convertTable(node);

    case 'panel':
      return convertPanel(node);

    default:
      // For unknown types, try to extract text content
      if (node.content) {
        return node.content.map((child: any) => convertADFNode(child)).join('');
      }
      return '';
  }
}

function convertParagraph(node: any): string {
  if (!node.content) {
    return '';
  }
  return node.content.map((child: any) => convertADFNode(child)).join('');
}

function convertHeading(node: any): string {
  const level = node.attrs?.level || 1;
  const prefix = '#'.repeat(level);
  const content = node.content ? node.content.map((child: any) => convertADFNode(child)).join('') : '';
  return `${prefix} ${content}`;
}

function convertBulletList(node: any): string {
  if (!node.content) {
    return '';
  }
  return node.content.map((item: any) => {
    const itemContent = item.content
      ? item.content.map((child: any) => convertADFNode(child)).join('')
      : '';
    return `- ${itemContent}`;
  }).join('\n');
}

function convertOrderedList(node: any): string {
  if (!node.content) {
    return '';
  }
  return node.content.map((item: any, index: number) => {
    const itemContent = item.content
      ? item.content.map((child: any) => convertADFNode(child)).join('')
      : '';
    return `${index + 1}. ${itemContent}`;
  }).join('\n');
}

function convertCodeBlock(node: any): string {
  const language = node.attrs?.language || '';
  const content = node.content
    ? node.content.map((child: any) => {
        if (child.type === 'text') {
          return child.text || '';
        }
        return '';
      }).join('')
    : '';
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

function convertBlockquote(node: any): string {
  if (!node.content) {
    return '';
  }
  const content = node.content.map((child: any) => convertADFNode(child)).join('\n');
  return content.split('\n').map((line: string) => `> ${line}`).join('\n');
}

function convertText(node: any): string {
  let text = node.text || '';

  // Apply text marks (bold, italic, etc.)
  if (node.marks) {
    for (const mark of node.marks) {
      switch (mark.type) {
        case 'strong':
          text = `**${text}**`;
          break;
        case 'em':
          text = `*${text}*`;
          break;
        case 'code':
          text = `\`${text}\``;
          break;
        case 'strike':
          text = `~~${text}~~`;
          break;
        case 'underline':
          text = `<u>${text}</u>`;
          break;
        case 'link':
          const href = mark.attrs?.href || '#';
          text = `[${text}](${href})`;
          break;
        case 'textColor':
          // Markdown doesn't support colors, just keep the text
          break;
      }
    }
  }

  return text;
}

function convertMention(node: any): string {
  const text = node.attrs?.text || '@unknown';
  return `**${text}**`;
}

function convertEmoji(node: any): string {
  return node.attrs?.shortName || node.attrs?.text || '';
}

function convertCard(node: any): string {
  const url = node.attrs?.url || '#';
  const title = node.attrs?.data?.title || url;
  return `[${title}](${url})`;
}

function convertMedia(node: any): string {
  if (!node.content) {
    return '';
  }
  return node.content.map((child: any) => {
    if (child.type === 'media') {
      const attrs = child.attrs || {};
      const alt = attrs.alt || 'image';
      const url = attrs.url || '#';
      return `![${alt}](${url})`;
    }
    return '';
  }).join('');
}

function convertTable(node: any): string {
  if (!node.content) {
    return '';
  }

  const rows = node.content.map((row: any) => {
    if (row.type === 'tableRow' && row.content) {
      const cells = row.content.map((cell: any) => {
        const cellContent = cell.content
          ? cell.content.map((child: any) => convertADFNode(child)).join(' ')
          : '';
        return cellContent;
      });
      return `| ${cells.join(' | ')} |`;
    }
    return '';
  });

  // Add separator after header row
  if (rows.length > 0) {
    const headerCells = node.content[0]?.content?.length || 0;
    const separator = `| ${Array(headerCells).fill('---').join(' | ')} |`;
    rows.splice(1, 0, separator);
  }

  return rows.join('\n');
}

function convertPanel(node: any): string {
  const panelType = node.attrs?.panelType || 'info';
  const content = node.content
    ? node.content.map((child: any) => convertADFNode(child)).join('\n')
    : '';

  // Use blockquote with emoji prefix for different panel types
  const prefixMap: Record<string, string> = {
    info: 'ℹ️',
    note: '📝',
    warning: '⚠️',
    success: '✅',
    error: '❌'
  };
  const prefix = prefixMap[panelType] || 'ℹ️';

  return `> ${prefix} ${content.split('\n').join('\n> ')}`;
}

/**
 * Format a date string to a more readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get the URL for a Jira issue
 */
function getIssueUrl(issueKey: string, baseUrl: string): string {
  return `${baseUrl}/browse/${issueKey}`;
}

/**
 * Generate well-formatted markdown file optimized for Copilot context
 *
 * Creates a comprehensive markdown document containing all relevant issue information
 * formatted for optimal use with GitHub Copilot.
 *
 * @param context - Full issue context including all related data
 * @param baseUrl - Jira instance base URL for generating links
 * @returns Markdown string ready to be saved to a file
 */
export function generateContextMarkdown(context: IssueContext, baseUrl: string): string {
  const { issue, acceptanceCriteria, comments, related, attachments } = context;
  const fields = issue.fields;

  let md = `# [${issue.key}] ${fields.summary}\n\n`;

  // Metadata section
  md += `**Status:** ${fields.status.name}  \n`;
  md += `**Priority:** ${fields.priority.name}  \n`;
  md += `**Type:** ${fields.issuetype.name}  \n`;
  md += `**Assignee:** ${fields.assignee?.displayName || 'Unassigned'}  \n`;
  md += `**Reporter:** ${fields.reporter.displayName}  \n`;
  md += `**Created:** ${formatDate(fields.created)}  \n`;
  md += `**Updated:** ${formatDate(fields.updated)}  \n`;

  if (fields.labels && fields.labels.length > 0) {
    md += `**Labels:** ${fields.labels.join(', ')}  \n`;
  }

  if (fields.components && fields.components.length > 0) {
    md += `**Components:** ${fields.components.map(c => c.name).join(', ')}  \n`;
  }

  if (fields.sprint) {
    md += `**Sprint:** ${fields.sprint.name}  \n`;
  }

  md += '\n';

  // Description section
  md += `## Description\n\n`;
  if (fields.description) {
    md += convertADFToMarkdown(fields.description) + '\n\n';
  } else {
    md += '*No description provided*\n\n';
  }

  // Acceptance Criteria section
  if (acceptanceCriteria) {
    md += `## Acceptance Criteria\n\n`;
    md += acceptanceCriteria + '\n\n';
  }

  // Parent issue (for subtasks)
  if (fields.parent) {
    md += `## Parent Issue\n\n`;
    md += `- [${fields.parent.key}](${getIssueUrl(fields.parent.key, baseUrl)}): ${fields.parent.fields.summary}\n\n`;
  }

  // Subtasks
  if (fields.subtasks && fields.subtasks.length > 0) {
    md += `## Subtasks\n\n`;
    fields.subtasks.forEach(subtask => {
      const status = subtask.fields.status.name;
      const icon = status === 'Done' ? '✅' : '⏳';
      md += `- ${icon} [${subtask.key}](${getIssueUrl(subtask.key, baseUrl)}): ${subtask.fields.summary}\n`;
    });
    md += '\n';
  }

  // Comments/Discussion section
  if (comments.length > 0) {
    md += `## Discussion\n\n`;
    comments.forEach((comment: JiraComment) => {
      md += `### ${comment.author.displayName} - ${formatDate(comment.created)}\n\n`;
      md += convertADFToMarkdown(comment.body) + '\n\n';
    });
  }

  // Related Issues section
  if (related.length > 0) {
    md += `## Related Issues\n\n`;
    related.forEach(rel => {
      md += `- [${rel.key}](${getIssueUrl(rel.key, baseUrl)}): ${rel.fields.summary} (${rel.fields.status.name})\n`;
    });
    md += '\n';
  }

  // Attachments section
  if (attachments.length > 0) {
    md += `## Attachments\n\n`;
    attachments.forEach((att: JiraAttachment) => {
      md += `- [${att.filename}](${att.content}) (${formatFileSize(att.size)})\n`;
    });
    md += '\n';
  }

  // Jira Link section
  md += `---\n\n`;
  md += `## Jira Link\n\n`;
  md += `[Open in Jira](${getIssueUrl(issue.key, baseUrl)})\n`;

  return md;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
