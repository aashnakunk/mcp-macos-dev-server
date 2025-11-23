# macchiato-mcp

A Model Context Protocol (MCP) server providing AI assistants with structured access to your macOS development environment, productivity tools, and Chrome browser history.

## Overview

macchiato-mcp is a local MCP server that exposes terminal commands, filesystem operations, git repositories, macOS system tools, and browser history to AI assistants through a secure, structured interface. All operations are constrained to configured directories with built-in safety mechanisms.

## Features

- **Terminal Execution**: Run shell commands with safety controls and output management
- **Filesystem Operations**: Read, write, list, and append files within allowed directories
- **Git Integration**: Check status, view logs, create commits, and push changes
- **Project Management**: Discover repositories and detect technology stacks
- **Note Taking**: Manage personal notes and integrate with Apple Notes
- **macOS Integration**: Control Reminders, Calendar, Clipboard, and system monitoring
- **Network Tools**: Check connections, ports, ping hosts, and test URLs
- **Browser History**: Search Chrome browsing history and open URLs

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- macOS (for system integration tools)
- Google Chrome (for browser tools)

### Setup

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Configure the MCP client (e.g., Claude Desktop):

Edit your MCP client configuration file (for Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "macchiato-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/macchiato-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

5. Restart your MCP client

## Configuration

### Allowed Directories

Edit `src/config.ts` to configure which directories the server can access:

```typescript
export const ALLOWED_ROOTS = [
  path.join(os.homedir(), "dev"),
  path.join(os.homedir(), "projects"),
  path.join(os.homedir(), "Desktop"),
  path.join(os.homedir(), "Documents"),
];
```

Only paths under these roots will be accessible to filesystem tools. This prevents accidental access to sensitive system files.

### Safety Configuration

The `DANGEROUS_PATTERNS` array in `src/config.ts` defines blocked command patterns:

```typescript
export const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,           // Prevent root deletion
  /:\(\)\{\s*:\|:&\s*\};:/,  // Block fork bombs
  /mkfs/,                     // Block filesystem formatting
  // ... additional patterns
];
```

Add or modify patterns as needed for your security requirements.

### Timeout and Output Limits

Adjust command execution limits in `src/config.ts`:

```typescript
export const DEFAULT_COMMAND_TIMEOUT = 10;      // seconds
export const DEFAULT_MAX_OUTPUT_CHARS = 10000;  // characters
```

## Available Tools

### Terminal Tools

**terminal_run_command**
- Execute shell commands with safety features
- Supports timeout, output truncation, and dry-run mode
- Automatically blocks dangerous command patterns

### Filesystem Tools

**fs_list_dir**
- List directory contents with metadata (size, modified date)
- Only works within allowed root directories

**fs_read_file**
- Read file contents as UTF-8 text
- Automatic truncation for large files

**fs_write_file**
- Write content to files
- Creates parent directories if needed
- Optional overwrite protection

**fs_append_file**
- Append content without overwriting existing files

### Git Tools

**git_status**
- Get repository status, current branch, and uncommitted changes

**git_log**
- Retrieve commit history with hash, author, date, and message

**git_commit**
- Create commits with optional staging of all changes

**git_push**
- Push commits to remote repositories

### Project Tools

**project_list_repos**
- Recursively find all git repositories under a directory

**project_detect_stack**
- Detect language, frameworks, and common commands
- Supports JavaScript/TypeScript, Python, Rust, Go, Java, Ruby

**project_run_tests**
- Run project tests with auto-detection of test commands

### Notes Tools

**notes_add**
- Add notes with optional tags
- Stored locally in `~/.aashna_dev_mcp/notes.json`

**notes_list**
- List notes, optionally filtered by tag

**notes_search**
- Search notes by text or tags with substring matching

### macOS Integration Tools

**macos_notes_list**, **macos_notes_create**, **macos_notes_search**
- Interact with Apple Notes app

**macos_reminders_list**, **macos_reminders_create**, **macos_reminders_complete**
- Manage Apple Reminders

**macos_clipboard_copy**, **macos_clipboard_read**, **macos_clipboard_clear**
- System clipboard operations

**macos_calendar_list_events**, **macos_calendar_create_event**, **macos_calendar_check_availability**, **macos_calendar_list**
- Calendar management

**macos_system_stats**
- Get CPU usage, memory, and disk space

**macos_process_list**, **macos_process_find**, **macos_process_kill**
- Process monitoring and management

**macos_disk_usage**
- Analyze disk usage for directories

**macos_network_connections**, **macos_network_check_port**, **macos_network_list_ports**, **macos_network_ping**, **macos_network_dns_lookup**, **macos_network_info**, **macos_network_test_url**
- Network diagnostics and monitoring

### Browser Tools

**browser_recent_history**
- Search recent Chrome browsing history by text and time window
- Searches both page titles and URLs
- Parameters:
  - `query` (required): Search text to match
  - `days` (optional): Number of days to look back (default: 3)
  - `limit` (optional): Maximum results to return (default: 10)
- Returns: Array of results with title, URL, last visit time (ISO 8601), and visit count

**browser_open_url**
- Open a URL in Google Chrome on macOS
- Parameters:
  - `url` (required): URL to open (must start with http:// or https://)
- Returns: Success status and message

## Usage Examples

### Basic Command Execution

Ask your AI assistant:
- "Run npm install in my project"
- "Check what processes are using port 3000"
- "Show me the git status of my repository"

### File Operations

- "Read the package.json from my project"
- "Create a .gitignore file with node_modules and dist"
- "List all files in the src directory"

### Browser Integration

- "Find the TypeScript tutorial I was reading yesterday"
- "Search my Chrome history for 'React documentation' from the last week"
- "Open that YouTube video about machine learning"

### Cross-Tool Workflows

- "Find the reinforcement learning video I watched and create a note with the URL"
- "Search my history for Python tutorials and add the top 3 to my reading list in Reminders"
- "What documentation sites did I visit this week?"

## Security Features

### Path Safety

All filesystem operations are restricted to `ALLOWED_ROOTS`. Attempts to access paths outside these directories will fail with a clear error.

### Command Safety

Dangerous command patterns are automatically blocked:
- Root deletion (`rm -rf /`)
- Fork bombs
- Filesystem formatting (`mkfs`)
- Direct disk writes (`dd`)
- Piping downloads to shell (`curl ... | bash`)

### Output Management

- Commands are automatically killed after timeout
- Output is truncated to prevent memory issues
- All errors return structured responses

### Browser Safety

- Read-only access to Chrome history database
- URL validation before opening
- Proper SQL escaping to prevent injection
- Creates temporary database copies to avoid locks

## Development

### Watch Mode

Automatically rebuild on file changes:
```bash
npm run dev
```

### Manual Testing

Run the server directly:
```bash
npm start
```

Test browser tools:
```bash
node test-browser.js history "search query"
node test-browser.js open "https://example.com"
```

### Adding New Tools

1. Create tool function in appropriate file under `src/tools/`
2. Export the function with JSDoc comments
3. Register in `src/index.ts`:
   - Add to `ListToolsRequestSchema` handler (tool metadata)
   - Add to `CallToolRequestSchema` handler (execution logic)
4. Update types in `src/core/types.ts` if needed
5. Rebuild: `npm run build`

## Project Structure

```
macchiato-mcp/
├── src/
│   ├── index.ts              # MCP server entry point & tool registration
│   ├── config.ts             # Configuration (allowed roots, safety rules)
│   ├── core/
│   │   ├── exec.ts           # Safe command execution
│   │   ├── paths.ts          # Path safety & validation
│   │   └── types.ts          # Shared TypeScript types
│   └── tools/
│       ├── terminal.ts       # Terminal command execution
│       ├── filesystem.ts     # File operations
│       ├── git.ts            # Git integration
│       ├── projects.ts       # Repository discovery
│       ├── notes.ts          # Personal notes
│       ├── browser.ts        # Chrome history & URL opening
│       ├── macos-notes.ts    # Apple Notes integration
│       ├── macos-reminders.ts
│       ├── macos-clipboard.ts
│       ├── macos-calendar.ts
│       ├── macos-system.ts
│       └── macos-network.ts
├── dist/                     # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── mcp.config.example.json   # Example MCP client configuration
```

## Troubleshooting

### Chrome History Not Found

If you see "Chrome history database not found":
- Ensure Google Chrome is installed
- Launch Chrome at least once
- Verify the path exists: `~/Library/Application Support/Google/Chrome/Default/History`

### Tool Not Available

If tools don't appear in your MCP client:
- Verify the build completed: `npm run build`
- Check the path in your MCP client configuration
- Restart your MCP client completely
- Check server logs (stderr) for errors

### Permission Errors

If you get permission errors:
- Verify the requested path is under an `ALLOWED_ROOT`
- Check file/directory permissions with `ls -la`
- Ensure the server process has read/write access

### Command Blocked

If a command is blocked:
- Review `DANGEROUS_PATTERNS` in `src/config.ts`
- Remove the pattern if you trust the command
- Use dry-run mode to preview: `{"dry_run": true}`

## Contributing

This is a personal development tool. Feel free to fork and customize for your own needs.

## License

MIT

## Built With

- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- TypeScript
- Node.js
