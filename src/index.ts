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
import {
  listAppleNotes,
  createAppleNote,
  searchAppleNotes,
} from "./tools/macos-notes.js";
import {
  listReminders,
  createReminder,
  completeReminder,
} from "./tools/macos-reminders.js";
import {
  copyToClipboard,
  readFromClipboard,
  clearClipboard,
} from "./tools/macos-clipboard.js";
import {
  getSystemStats,
  listProcesses,
  findProcesses,
  killProcess,
  analyzeDiskUsage,
} from "./tools/macos-system.js";
import {
  listConnections,
  checkPort,
  listPorts,
  pingHost,
  dnsLookup,
  getNetworkInfo,
  testUrl,
} from "./tools/macos-network.js";
import {
  listCalendarEvents,
  createCalendarEvent,
  checkAvailability,
  listCalendars,
} from "./tools/macos-calendar.js";
import {
  searchRecentHistory,
  openUrl,
} from "./tools/browser.js";

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

        // macOS Apple Notes tools
        {
          name: "macos_notes_list",
          description:
            "Lists notes from Apple Notes app. Can filter by folder name.",
          inputSchema: {
            type: "object",
            properties: {
              folder: {
                type: "string",
                description: "Optional folder name to filter by",
              },
              limit: {
                type: "number",
                description: "Maximum notes to return (default: 50)",
              },
            },
          },
        },
        {
          name: "macos_notes_create",
          description:
            "Creates a new note in Apple Notes app.",
          inputSchema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Note title",
              },
              body: {
                type: "string",
                description: "Note content",
              },
              folder: {
                type: "string",
                description: "Optional folder name (default: Notes)",
              },
            },
            required: ["title", "body"],
          },
        },
        {
          name: "macos_notes_search",
          description:
            "Searches Apple Notes by text content.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query",
              },
              limit: {
                type: "number",
                description: "Maximum results (default: 20)",
              },
            },
            required: ["query"],
          },
        },

        // macOS Reminders tools
        {
          name: "macos_reminders_list",
          description:
            "Lists reminders from Apple Reminders app.",
          inputSchema: {
            type: "object",
            properties: {
              list: {
                type: "string",
                description: "Optional list name to filter by",
              },
              completed: {
                type: "boolean",
                description: "Show completed reminders (default: false)",
              },
              limit: {
                type: "number",
                description: "Maximum reminders to return (default: 50)",
              },
            },
          },
        },
        {
          name: "macos_reminders_create",
          description:
            "Creates a new reminder in Apple Reminders app.",
          inputSchema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Reminder title/task",
              },
              list: {
                type: "string",
                description: "List name (default: Reminders)",
              },
              due_date: {
                type: "string",
                description: "Optional due date (e.g., 'tomorrow', '2024-12-25')",
              },
              notes: {
                type: "string",
                description: "Optional notes/description",
              },
            },
            required: ["title"],
          },
        },
        {
          name: "macos_reminders_complete",
          description:
            "Marks a reminder as complete in Apple Reminders app.",
          inputSchema: {
            type: "object",
            properties: {
              reminder_name: {
                type: "string",
                description: "Name of the reminder to complete",
              },
              list: {
                type: "string",
                description: "Optional list name to search in",
              },
            },
            required: ["reminder_name"],
          },
        },

        // macOS Clipboard tools
        {
          name: "macos_clipboard_copy",
          description:
            "Copies text to the system clipboard.",
          inputSchema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "Text to copy to clipboard",
              },
            },
            required: ["text"],
          },
        },
        {
          name: "macos_clipboard_read",
          description:
            "Reads text from the system clipboard.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "macos_clipboard_clear",
          description:
            "Clears the system clipboard.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },

        // macOS System Monitoring tools
        {
          name: "macos_system_stats",
          description:
            "Gets overall system statistics (CPU usage, memory, disk space). Use this to check Mac performance and resources.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "macos_process_list",
          description:
            "Lists running processes sorted by resource usage. Great for finding what's using CPU or memory.",
          inputSchema: {
            type: "object",
            properties: {
              sort_by: {
                type: "string",
                enum: ["cpu", "memory"],
                description: "Sort by cpu or memory (default: cpu)",
              },
              limit: {
                type: "number",
                description: "Number of processes to return (default: 20)",
              },
            },
          },
        },
        {
          name: "macos_process_find",
          description:
            "Finds processes by name or pattern. Useful for checking if specific apps are running.",
          inputSchema: {
            type: "object",
            properties: {
              pattern: {
                type: "string",
                description: "Process name or pattern to search for",
              },
            },
            required: ["pattern"],
          },
        },
        {
          name: "macos_process_kill",
          description:
            "Kills a process by PID. Use with caution - this is destructive!",
          inputSchema: {
            type: "object",
            properties: {
              pid: {
                type: "number",
                description: "Process ID to kill",
              },
              force: {
                type: "boolean",
                description: "Use SIGKILL (-9) instead of SIGTERM (default: false)",
              },
            },
            required: ["pid"],
          },
        },
        {
          name: "macos_disk_usage",
          description:
            "Analyzes disk usage for a directory. Shows what's taking up space.",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Directory path to analyze (default: home directory)",
              },
              depth: {
                type: "number",
                description: "How deep to scan (default: 1)",
              },
            },
          },
        },

        // macOS Network tools
        {
          name: "macos_network_connections",
          description:
            "Lists active network connections.",
          inputSchema: {
            type: "object",
            properties: {
              state: {
                type: "string",
                description: "Filter by state (e.g., ESTABLISHED, LISTEN)",
              },
            },
          },
        },
        {
          name: "macos_network_check_port",
          description:
            "Checks what process is using a specific port.",
          inputSchema: {
            type: "object",
            properties: {
              port: {
                type: "number",
                description: "Port number to check",
              },
            },
            required: ["port"],
          },
        },
        {
          name: "macos_network_list_ports",
          description:
            "Lists all ports currently in use.",
          inputSchema: {
            type: "object",
            properties: {
              listening_only: {
                type: "boolean",
                description: "Only show listening ports (default: true)",
              },
            },
          },
        },
        {
          name: "macos_network_ping",
          description:
            "Pings a host to check connectivity.",
          inputSchema: {
            type: "object",
            properties: {
              host: {
                type: "string",
                description: "Hostname or IP address",
              },
              count: {
                type: "number",
                description: "Number of pings (default: 4)",
              },
            },
            required: ["host"],
          },
        },
        {
          name: "macos_network_dns_lookup",
          description:
            "Performs DNS lookup for a hostname.",
          inputSchema: {
            type: "object",
            properties: {
              hostname: {
                type: "string",
                description: "Hostname to look up",
              },
            },
            required: ["hostname"],
          },
        },
        {
          name: "macos_network_info",
          description:
            "Gets current network interface information (IP addresses, etc).",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "macos_network_test_url",
          description:
            "Tests HTTP/HTTPS connectivity to a URL.",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "URL to test",
              },
            },
            required: ["url"],
          },
        },

        // macOS Calendar tools
        {
          name: "macos_calendar_list_events",
          description:
            "Lists upcoming calendar events from Apple Calendar.",
          inputSchema: {
            type: "object",
            properties: {
              days_ahead: {
                type: "number",
                description: "Number of days to look ahead (default: 7)",
              },
              limit: {
                type: "number",
                description: "Maximum events to return (default: 20)",
              },
            },
          },
        },
        {
          name: "macos_calendar_create_event",
          description:
            "Creates a new calendar event in Apple Calendar.",
          inputSchema: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "Event title/summary",
              },
              start_date: {
                type: "string",
                description: "Start date/time (e.g., 'tomorrow at 2pm', '12/25/2024 10:00 AM')",
              },
              duration_minutes: {
                type: "number",
                description: "Event duration in minutes (default: 60)",
              },
              location: {
                type: "string",
                description: "Optional location",
              },
              calendar: {
                type: "string",
                description: "Calendar name (optional)",
              },
            },
            required: ["summary", "start_date"],
          },
        },
        {
          name: "macos_calendar_check_availability",
          description:
            "Checks calendar availability for a time range.",
          inputSchema: {
            type: "object",
            properties: {
              start_date: {
                type: "string",
                description: "Start date/time to check",
              },
              end_date: {
                type: "string",
                description: "End date/time to check",
              },
            },
            required: ["start_date", "end_date"],
          },
        },
        {
          name: "macos_calendar_list",
          description:
            "Lists all available calendars.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },

        // Browser tools
        {
          name: "browser_recent_history",
          description:
            "Search recent Chrome browsing history by text and time window. Searches both page titles and URLs. Useful for finding pages you recently visited.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search text to match in title OR URL",
              },
              days: {
                type: "number",
                description: "Number of days to look back (default: 3)",
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return (default: 10)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "browser_open_url",
          description:
            "Open a given URL in Google Chrome on macOS. The URL must start with http:// or https://.",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "URL to open (must start with http:// or https://)",
              },
            },
            required: ["url"],
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

      // macOS Apple Notes tools
      if (name === "macos_notes_list") {
        const result = await listAppleNotes(
          args.folder as string | undefined,
          args.limit as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_notes_create") {
        const result = await createAppleNote(
          args.title as string,
          args.body as string,
          args.folder as string | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_notes_search") {
        const result = await searchAppleNotes(
          args.query as string,
          args.limit as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // macOS Reminders tools
      if (name === "macos_reminders_list") {
        const result = await listReminders(
          args.list as string | undefined,
          args.completed as boolean | undefined,
          args.limit as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_reminders_create") {
        const result = await createReminder(
          args.title as string,
          args.list as string | undefined,
          args.due_date as string | undefined,
          args.notes as string | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_reminders_complete") {
        const result = await completeReminder(
          args.reminder_name as string,
          args.list as string | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // macOS Clipboard tools
      if (name === "macos_clipboard_copy") {
        const result = await copyToClipboard(args.text as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_clipboard_read") {
        const result = await readFromClipboard();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_clipboard_clear") {
        const result = await clearClipboard();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // macOS System Monitoring tools
      if (name === "macos_system_stats") {
        const result = await getSystemStats();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_process_list") {
        const result = await listProcesses(
          args.sort_by as "cpu" | "memory" | undefined,
          args.limit as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_process_find") {
        const result = await findProcesses(args.pattern as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_process_kill") {
        const result = await killProcess(
          args.pid as number,
          args.force as boolean | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_disk_usage") {
        const result = await analyzeDiskUsage(
          args.path as string | undefined,
          args.depth as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // macOS Network tools
      if (name === "macos_network_connections") {
        const result = await listConnections(args.state as string | undefined);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_network_check_port") {
        const result = await checkPort(args.port as number);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_network_list_ports") {
        const result = await listPorts(args.listening_only as boolean | undefined);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_network_ping") {
        const result = await pingHost(
          args.host as string,
          args.count as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_network_dns_lookup") {
        const result = await dnsLookup(args.hostname as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_network_info") {
        const result = await getNetworkInfo();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_network_test_url") {
        const result = await testUrl(args.url as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // macOS Calendar tools
      if (name === "macos_calendar_list_events") {
        const result = await listCalendarEvents(
          args.days_ahead as number | undefined,
          args.limit as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_calendar_create_event") {
        const result = await createCalendarEvent(
          args.summary as string,
          args.start_date as string,
          args.duration_minutes as number | undefined,
          args.location as string | undefined,
          args.calendar as string | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_calendar_check_availability") {
        const result = await checkAvailability(
          args.start_date as string,
          args.end_date as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "macos_calendar_list") {
        const result = await listCalendars();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // Browser tools
      if (name === "browser_recent_history") {
        const result = await searchRecentHistory(
          args.query as string,
          args.days as number | undefined,
          args.limit as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "browser_open_url") {
        const result = await openUrl(args.url as string);
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

