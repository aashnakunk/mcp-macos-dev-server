#!/usr/bin/env node

/**
 * aashna-dev-mcp - A local MCP server for development tools
 * 
 * This server exposes terminal, filesystem, git, project, and notes tools
 * to AI assistants via the Model Context Protocol.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import all tools
import { runCommand } from "./tools/terminal.js";
import {
  listDirectory,
  readFile,
  writeFile,
  appendFile,
} from "./tools/filesystem.js";
import {
  getGitStatus,
  getGitLog,
  createGitCommit,
  pushGitCommit,
} from "./tools/git.js";
import {
  listRepositories,
  detectTechStack,
  runTests,
} from "./tools/projects.js";
import { addNote, listNotes, searchNotes } from "./tools/notes.js";

/**
 * Creates and configures the MCP server
 */
function createServer(): Server {
  const server = new Server(
    {
      name: "aashna-dev-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * Handler for listing available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Terminal tools
        {
          name: "terminal_run_command",
          description:
            "Executes a shell command with safety features. Supports timeout, output truncation, and dangerous command detection. Use for running builds, scripts, installations, or checking system state.",
          inputSchema: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description: "The shell command to execute",
              },
              cwd: {
                type: "string",
                description: "Working directory for the command (optional)",
              },
              timeout_seconds: {
                type: "number",
                description: "Command timeout in seconds (default: 10)",
              },
              max_output_chars: {
                type: "number",
                description: "Maximum output length in characters (default: 10000)",
              },
              dry_run: {
                type: "boolean",
                description: "If true, don't execute, just preview (default: false)",
              },
            },
            required: ["command"],
          },
        },

        // Filesystem tools
        {
          name: "fs_list_dir",
          description:
            "Lists entries in a directory with metadata (size, modified date). Only works within allowed root directories.",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the directory to list",
              },
            },
            required: ["path"],
          },
        },
        {
          name: "fs_read_file",
          description:
            "Reads file contents as UTF-8 text. Large files are automatically truncated. Only works within allowed root directories.",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the file to read",
              },
              max_bytes: {
                type: "number",
                description: "Maximum bytes to read (default: 100000)",
              },
            },
            required: ["path"],
          },
        },
        {
          name: "fs_write_file",
          description:
            "Writes content to a file, creating parent directories if needed. Can optionally prevent overwriting existing files.",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the file to write",
              },
              content: {
                type: "string",
                description: "Content to write",
              },
              overwrite: {
                type: "boolean",
                description: "Allow overwriting existing file (default: true)",
              },
            },
            required: ["path", "content"],
          },
        },
        {
          name: "fs_append_file",
          description:
            "Appends content to a file without overwriting existing content. Creates the file if it doesn't exist.",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the file to append to",
              },
              content: {
                type: "string",
                description: "Content to append",
              },
            },
            required: ["path", "content"],
          },
        },

        // Git tools
        {
          name: "git_status",
          description:
            "Gets the git status of a repository, showing current branch, staged changes, and uncommitted files.",
          inputSchema: {
            type: "object",
            properties: {
              repo_path: {
                type: "string",
                description: "Path to the git repository",
              },
            },
            required: ["repo_path"],
          },
        },
        {
          name: "git_log",
          description:
            "Retrieves commit history with hash, author, date, and message for each commit.",
          inputSchema: {
            type: "object",
            properties: {
              repo_path: {
                type: "string",
                description: "Path to the git repository",
              },
              max_commits: {
                type: "number",
                description: "Maximum number of commits to retrieve (default: 10)",
              },
            },
            required: ["repo_path"],
          },
        },
        {
          name: "git_commit",
          description:
            "Creates a git commit with the specified message. Can optionally stage all changes first. This is a write operation - use carefully.",
          inputSchema: {
            type: "object",
            properties: {
              repo_path: {
                type: "string",
                description: "Path to the git repository",
              },
              message: {
                type: "string",
                description: "Commit message",
              },
              add_all: {
                type: "boolean",
                description: "Stage all changes before committing (default: true)",
              },
            },
            required: ["repo_path", "message"],
          },
        },
        {
          name: "git_push",
          description:
            "Pushes commits to a remote repository. This is a write operation that affects remote state - use carefully.",
          inputSchema: {
            type: "object",
            properties: {
              repo_path: {
                type: "string",
                description: "Path to the git repository",
              },
              remote: {
                type: "string",
                description: "Remote name (default: origin)",
              },
              branch: {
                type: "string",
                description: "Branch name (default: main)",
              },
            },
            required: ["repo_path"],
          },
        },

        // Project tools
        {
          name: "project_list_repos",
          description:
            "Recursively finds all git repositories under a root directory. Useful for discovering projects.",
          inputSchema: {
            type: "object",
            properties: {
              root_path: {
                type: "string",
                description: "Root directory to search",
              },
              max_depth: {
                type: "number",
                description: "Maximum search depth (default: 3)",
              },
            },
            required: ["root_path"],
          },
        },
        {
          name: "project_detect_stack",
          description:
            "Analyzes a repository to detect language, frameworks, and common commands (test, dev). Uses heuristics based on files like package.json, requirements.txt, etc.",
          inputSchema: {
            type: "object",
            properties: {
              repo_path: {
                type: "string",
                description: "Path to the repository",
              },
            },
            required: ["repo_path"],
          },
        },
        {
          name: "project_run_tests",
          description:
            "Runs tests for a project. If test_command is not provided, attempts to auto-detect based on project structure.",
          inputSchema: {
            type: "object",
            properties: {
              repo_path: {
                type: "string",
                description: "Path to the repository",
              },
              test_command: {
                type: "string",
                description: "Test command to run (optional, will auto-detect)",
              },
            },
            required: ["repo_path"],
          },
        },

        // Notes tools
        {
          name: "notes_add",
          description:
            "Adds a new note with optional tags. Notes are stored locally and persist across sessions. Useful for capturing ideas, TODOs, or reminders.",
          inputSchema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The note content",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Optional tags for categorization",
              },
            },
            required: ["text"],
          },
        },
        {
          name: "notes_list",
          description:
            "Lists notes, optionally filtered by tag. Returns notes sorted by newest first.",
          inputSchema: {
            type: "object",
            properties: {
              tag: {
                type: "string",
                description: "Filter by tag (optional)",
              },
              limit: {
                type: "number",
                description: "Maximum number of notes to return (default: 50)",
              },
            },
          },
        },
        {
          name: "notes_search",
          description:
            "Searches notes by text or tags using substring matching. Returns matching notes sorted by newest first.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query (case-insensitive)",
              },
              limit: {
                type: "number",
                description: "Maximum number of results (default: 20)",
              },
            },
            required: ["query"],
          },
        },
      ],
    };
  });

  /**
   * Handler for tool execution
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (!args) {
        throw new Error("No arguments provided");
      }

      // Terminal tools
      if (name === "terminal_run_command") {
        const result = await runCommand(args as any);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // Filesystem tools
      if (name === "fs_list_dir") {
        const result = await listDirectory(args.path as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "fs_read_file") {
        const result = await readFile(
          args.path as string,
          args.max_bytes as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "fs_write_file") {
        const result = await writeFile(
          args.path as string,
          args.content as string,
          args.overwrite as boolean | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "fs_append_file") {
        const result = await appendFile(
          args.path as string,
          args.content as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // Git tools
      if (name === "git_status") {
        const result = await getGitStatus(args.repo_path as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "git_log") {
        const result = await getGitLog(
          args.repo_path as string,
          args.max_commits as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "git_commit") {
        const result = await createGitCommit(
          args.repo_path as string,
          args.message as string,
          args.add_all as boolean | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "git_push") {
        const result = await pushGitCommit(
          args.repo_path as string,
          args.remote as string | undefined,
          args.branch as string | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // Project tools
      if (name === "project_list_repos") {
        const result = await listRepositories(
          args.root_path as string,
          args.max_depth as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "project_detect_stack") {
        const result = await detectTechStack(args.repo_path as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "project_run_tests") {
        const result = await runTests(
          args.repo_path as string,
          args.test_command as string | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // Notes tools
      if (name === "notes_add") {
        const result = await addNote(
          args.text as string,
          args.tags as string[] | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "notes_list") {
        const result = await listNotes(
          args.tag as string | undefined,
          args.limit as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "notes_search") {
        const result = await searchNotes(
          args.query as string,
          args.limit as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: error.message || "Unknown error",
                details: error.stack,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Main entry point
 */
async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  console.error("aashna-dev-mcp server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

