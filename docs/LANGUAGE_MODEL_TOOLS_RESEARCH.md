# Language Model Tools API - Research and Implementation Guide

**Feature 8.1 - Research Documentation**
**Date:** 2025-11-02
**Status:** ✅ Complete

## Overview

This document captures the research findings from Feature 8.1: Language Model Tools API Research. It provides a comprehensive understanding of VS Code's Language Model Tools API and serves as a reference for implementing additional Copilot tools in Epic 8.

## What are Language Model Tools?

Language Model Tools are functions that can be invoked by language models (like GitHub Copilot) as part of chat requests. They extend LLM functionality with domain-specific capabilities, allowing AI assistants to interact with external services, retrieve data, or perform actions.

### Key Characteristics

- **Auto-invoked**: Tools are automatically called by the language model based on conversation context
- **Typed Parameters**: Input validated against JSON Schema
- **Structured Output**: Returns LanguageModelToolResult containing text or other content
- **User Confirmation**: Optional prepareInvocation method for user approval
- **Extension-provided**: Each extension can register its own tools

## API Architecture

### Core Components

1. **vscode.lm namespace**: Main entry point for language model interactions
   - `lm.registerTool()`: Register a new tool
   - `lm.invokeTool()`: Programmatically invoke a tool
   - `lm.tools`: Array of all registered tools
   - `lm.selectChatModels()`: Select available language models

2. **LanguageModelTool Interface**: Implementation contract for tools
   ```typescript
   interface LanguageModelTool<T> {
     prepareInvocation(
       options: LanguageModelToolInvocationPrepareOptions<T>,
       token: CancellationToken
     ): Promise<PreparedToolInvocation>;

     invoke(
       options: LanguageModelToolInvocationOptions<T>,
       token: CancellationToken
     ): Promise<LanguageModelToolResult>;
   }
   ```

3. **LanguageModelToolResult**: Wrapper for tool output
   - Contains array of LanguageModelTextPart or other content types
   - Can include multiple parts for structured responses

## Registration Process

### Step 1: Define Tool in package.json

Tools must be declared in the `languageModelTools` contribution point:

```json
{
  "contributes": {
    "languageModelTools": [
      {
        "name": "tool_name",
        "displayName": "Human-Readable Name",
        "modelDescription": "Instructions for LLM on when/how to use",
        "userDescription": "Description shown to users in UI",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "reference_name",
        "inputSchema": {
          "type": "object",
          "properties": {
            "param": {
              "type": "string",
              "description": "Parameter description"
            }
          },
          "required": ["param"]
        }
      }
    ]
  }
}
```

#### Package.json Properties

| Property | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Unique identifier (format: `{verb}_{noun}`) |
| `displayName` | Yes | User-friendly label for UI |
| `modelDescription` | Yes | Instructions for LLM (critical for proper usage) |
| `userDescription` | No | Description for end users |
| `canBeReferencedInPrompt` | No | Enable agent mode usage (default: false) |
| `toolReferenceName` | No | Alternative name for chat prompts |
| `inputSchema` | Yes | JSON Schema defining parameters |
| `when` | No | Conditional availability clause |
| `icon` | No | Icon identifier for UI |

### Step 2: Implement Tool Class

Create a class implementing `LanguageModelTool<T>`:

```typescript
export class MyTool implements vscode.LanguageModelTool<IMyToolParameters> {
  /**
   * Called before invocation for user confirmation
   */
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<IMyToolParameters>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `About to perform action with ${options.input.param}...`
    };
  }

  /**
   * Executes the tool logic
   */
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<IMyToolParameters>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const result = await performAction(options.input);

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(result)
      ]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`Error: ${error.message}`)
      ]);
    }
  }
}
```

### Step 3: Register Tool on Activation

In `extension.ts` activate function:

```typescript
export function activate(context: vscode.ExtensionContext) {
  const myTool = new MyTool();

  context.subscriptions.push(
    vscode.lm.registerTool('tool_name', myTool)
  );
}
```

**Important**: The tool name in `registerTool()` must exactly match the `name` in package.json.

## Tool Invocation Flow

1. **User interacts with Copilot** in chat or agent mode
2. **Copilot receives available tools** from extension registrations and MCP servers
3. **LLM analyzes context** and determines which tools to invoke
4. **prepareInvocation called** (if implemented) for user confirmation
5. **invoke method executes** with validated parameters
6. **Result returned to LLM** for processing and response generation
7. **LLM may call additional tools** based on results (iterative process)
8. **Final response presented** to user combining multiple tool results

## Input Schema Design

Use JSON Schema to define and validate parameters:

```json
{
  "type": "object",
  "properties": {
    "issueKey": {
      "type": "string",
      "description": "The Jira issue key (e.g., PROJ-123)",
      "pattern": "^[A-Z]+-[0-9]+$"
    },
    "comment": {
      "type": "string",
      "description": "Comment text to add"
    },
    "optional": {
      "type": "boolean",
      "description": "Optional parameter"
    }
  },
  "required": ["issueKey", "comment"]
}
```

### Schema Best Practices

- Use descriptive property names
- Provide clear descriptions for each parameter
- Include patterns/formats for validation
- Mark required vs optional parameters
- Use appropriate types (string, number, boolean, object, array)

## Model Descriptions

The `modelDescription` field is critical - it guides the LLM on when and how to use the tool.

### Good Model Descriptions

✅ **Specific and actionable:**
```
"Retrieves detailed information about a specific Jira issue by its key (e.g., PROJ-123).
Use this tool when you need to get the current status, description, assignee, priority,
or other details about a Jira ticket. The issue key must be provided in the format
PROJECT-NUMBER."
```

✅ **Includes limitations:**
```
"Adds a comment to a Jira issue. Use this when documenting progress or responding to
discussion. Cannot edit existing comments. Requires issue key in format PROJ-123."
```

### Poor Model Descriptions

❌ **Too vague:**
```
"Gets information about issues"
```

❌ **No usage guidance:**
```
"Jira issue retrieval tool"
```

## Error Handling

Tools should handle errors gracefully and return helpful messages:

```typescript
try {
  const result = await apiCall();
  return new vscode.LanguageModelToolResult([
    new vscode.LanguageModelTextPart(formatResult(result))
  ]);
} catch (error) {
  if (error instanceof AuthenticationError) {
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        'Authentication failed. Please run "Jira: Configure" to set up credentials.'
      )
    ]);
  }

  return new vscode.LanguageModelToolResult([
    new vscode.LanguageModelTextPart(
      `Error: ${error.message}. Please check the issue key format (e.g., PROJ-123).`
    )
  ]);
}
```

### Error Handling Best Practices

- Catch and handle specific error types
- Provide actionable error messages
- Guide users on how to resolve issues
- Don't expose sensitive information in error messages
- Help LLM understand what went wrong for recovery

## Confirmation Flows

Use `prepareInvocation` for actions requiring user approval:

```typescript
async prepareInvocation(
  options: vscode.LanguageModelToolInvocationPrepareOptions<IUpdateStatusParameters>,
  _token: vscode.CancellationToken
): Promise<vscode.PreparedToolInvocation> {
  return {
    invocationMessage:
      `Ready to update ${options.input.issueKey} status to "${options.input.status}". ` +
      `This will be visible to all team members.`
  };
}
```

**When to use confirmations:**
- Destructive actions (delete, update status)
- Actions with side effects (logging time, creating issues)
- Actions affecting multiple items
- External API calls that modify data

**When to skip confirmations:**
- Read-only operations (fetching issue info)
- User explicitly requested the action
- Action is easily reversible

## Proof of Concept Implementation

### GetIssueInfoTool

We implemented a proof of concept tool that retrieves Jira issue information:

**Features:**
- ✅ Fetches issue details by key
- ✅ Formats information for LLM consumption
- ✅ Handles authentication via AuthManager
- ✅ Uses caching for performance
- ✅ Extracts text from Atlassian Document Format (ADF)
- ✅ Provides helpful error messages

**Files Created:**
- `src/tools/GetIssueInfoTool.ts` - Tool implementation
- Updated `package.json` - Added languageModelTools contribution
- Updated `src/extension.ts` - Tool registration

**Usage:**
Once registered, Copilot can automatically invoke this tool when users ask questions like:
- "What's the status of PROJ-123?"
- "Show me details for issue ABC-456"
- "Get information about ticket XYZ-789"

## Key Learnings

### 1. Tool Registration Requirements

**Must have both:**
- Declaration in package.json `languageModelTools` contribution
- Registration via `vscode.lm.registerTool()` in code

**If only declared in package.json:** Tool won't be invoked (no handler)
**If only registered in code:** Tool won't be discovered by LLM

### 2. Dynamic Registration Limitations

Currently, tools cannot be dynamically registered based on runtime configuration without a package.json declaration. Each tool must be pre-declared in the manifest.

**Workaround:** Use `when` clauses in package.json for conditional availability.

### 3. Model Description Impact

The quality of the `modelDescription` directly impacts how often and appropriately the LLM uses the tool. Invest time in clear, detailed descriptions.

### 4. Authentication Context

Tools need access to authentication state. Pass `AuthManager` or credentials through tool constructor rather than trying to access global state.

### 5. Caching Considerations

Use caching to avoid repeated API calls, but ensure cache invalidation for tools that modify data.

## Next Steps for Epic 8

Based on this research, the following features are ready for implementation:

### Feature 8.2: Tools Provider Implementation
- ✅ Architecture understood
- ✅ Registration pattern established
- Ready to create base infrastructure

### Feature 8.3: Tool: Add Comment
- Pattern: Similar to GetIssueInfoTool
- Add confirmation via prepareInvocation
- Validate comment text before submission

### Feature 8.4: Tool: Update Status
- Pattern: Similar to GetIssueInfoTool
- Requires confirmation (destructive action)
- Fetch available transitions first

### Feature 8.5: Tool: Link PR
- Pattern: URL validation + API call
- Confirmation recommended
- Check for existing links

### Feature 8.6: Tool: Create Subtask
- Most complex tool (multiple parameters)
- Confirmation required
- Validate parent issue exists

### Feature 8.7: Tool: Log Time (Optional)
- Time parsing challenges
- Confirmation required
- Validate time format

## References

- [Language Model Tool API Guide](https://code.visualstudio.com/api/extension-guides/ai/tools)
- [Language Model API Documentation](https://code.visualstudio.com/api/extension-guides/ai/language-model)
- [VS Code API Reference](https://code.visualstudio.com/api/references/vscode-api)
- [JSON Schema Documentation](https://json-schema.org/)
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [Anthropic Tool Use Guide](https://docs.anthropic.com/claude/docs/tool-use)

## Conclusion

The VS Code Language Model Tools API provides a powerful mechanism for extending Copilot with domain-specific capabilities. The API is well-designed, with clear separation between declaration (package.json) and implementation (TypeScript).

Key success factors:
1. Clear, detailed model descriptions
2. Robust error handling with actionable messages
3. Appropriate use of confirmation flows
4. Proper authentication context management
5. Input validation via JSON Schema

The proof of concept (GetIssueInfoTool) demonstrates that the API works as documented and provides a solid foundation for implementing the remaining tools in Epic 8.

---

**Implementation Status:** ✅ Complete
**Compiled Successfully:** ✅ Yes
**Ready for Next Feature:** ✅ Yes (Feature 8.2)
