# aashna-dev-mcp

A local Model Context Protocol (MCP) server that exposes your development environment to AI assistants. This server provides safe, structured access to your terminal, filesystem, git repositories, and personal notes.

## 🎯 What is this?

`aashna-dev-mcp` is a personal development assistant server that runs on your laptop. It allows AI assistants (like Claude, via MCP-compatible clients) to help you:

- Run terminal commands
- Read and write files
- Manage git repositories
- Analyze project structures
- Run tests and detect tech stacks
- Keep personal notes and TODOs

All operations are constrained to configured "allowed roots" for safety, and dangerous commands are automatically blocked.

## 🏗️ Architecture

The project is organized for clarity and extensibility:

```
aashna-dev-mcp/
├── src/
│   ├── index.ts              # MCP server entry point & tool registration
│   ├── config.ts             # Configuration (allowed roots, safety rules)
│   ├── core/
│   │   ├── exec.ts           # Safe command execution
│   │   ├── paths.ts          # Path safety & validation
│   │   └── types.ts          # Shared TypeScript types
│   └── tools/
│       ├── terminal.ts       # Terminal command execution
│       ├── filesystem.ts     # File read/write/list operations
│       ├── git.ts            # Git status/log/commit/push
│       ├── projects.ts       # Repo discovery & tech stack detection
│       └── notes.ts          # Personal notes management
├── package.json
├── tsconfig.json
└── mcp.config.json           # MCP client configuration
```

## 🚀 Installation & Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure allowed roots

Edit `src/config.ts` to set which directories the server can access:

```typescript
export const ALLOWED_ROOTS = [
  path.join(os.homedir(), "dev"),
  path.join(os.homedir(), "projects"),
  path.join(os.homedir(), "Desktop"),
  path.join(os.homedir(), "Documents"),
];
```

**Important:** Only paths under these roots will be accessible to tools. This prevents accidental access to sensitive system files.

### 3. Build the project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 4. Register with an MCP client

Copy `mcp.config.json` to your MCP client's configuration directory. For example, with Claude Desktop:

```bash
# macOS
cp mcp.config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Or manually add the server to your existing config
```

Update the `args` path in `mcp.config.json` to point to your compiled server:

```json
{
  "mcpServers": {
    "aashna-dev-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/your/aashna-dev-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

### 5. Start using it!

Restart your MCP client (e.g., Claude Desktop), and the tools should be available.

## 🛠️ Available Tools

### Terminal Tools

#### `terminal.run_command`

Executes shell commands with safety features.

**Example prompts:**
- "Run `npm install` in my project"
- "Check what processes are using port 3000"
- "Build the production bundle with npm run build"

**Safety features:**
- Blocks dangerous patterns (rm -rf /, fork bombs, etc.)
- Configurable timeout (default 10s)
- Output truncation to prevent overwhelming responses
- Dry-run mode to preview commands

### Filesystem Tools

#### `fs.list_dir`

Lists directory contents with metadata.

**Example prompts:**
- "Show me what's in ~/dev"
- "List all files in the src/ directory"

#### `fs.read_file`

Reads file contents (UTF-8).

**Example prompts:**
- "Read the package.json from my project"
- "Show me the contents of main.py"

#### `fs.write_file`

Writes content to a file.

**Example prompts:**
- "Create a .gitignore file with node_modules and dist"
- "Write this config to config.json"

#### `fs.append_file`

Appends to a file without overwriting.

**Example prompts:**
- "Add this line to my .env file"
- "Append this log entry to debug.log"

### Git Tools

#### `git.status`

Gets repository status.

**Example prompts:**
- "Check the git status of my-project"
- "Are there any uncommitted changes?"

#### `git.log`

Retrieves commit history.

**Example prompts:**
- "Show me the last 5 commits"
- "What changes were made recently?"

#### `git.commit`

Creates a commit.

**Example prompts:**
- "Commit these changes with message 'Fix bug in parser'"
- "Stage and commit all changes"

#### `git.push`

Pushes to remote.

**Example prompts:**
- "Push to origin main"
- "Push my commits to the remote repository"

### Project Tools

#### `project.list_repos`

Finds all git repositories under a directory.

**Example prompts:**
- "List all repositories in ~/dev"
- "Find all my projects"

#### `project.detect_stack`

Detects language, frameworks, and common commands.

**Example prompts:**
- "What tech stack is used in my-project?"
- "How do I run tests in this repo?"

Detects:
- **Languages:** JavaScript/TypeScript, Python, Rust, Go, Java/Kotlin, Ruby
- **Frameworks:** React, Vue, Next.js, Django, Flask, Rails, and more
- **Commands:** Infers test and dev commands from project files

#### `project.run_tests`

Runs project tests (auto-detects test command if not provided).

**Example prompts:**
- "Run tests in my LangGraph project"
- "Execute the test suite and show me failures"

### Notes Tools

#### `notes.add`

Saves a note with optional tags.

**Example prompts:**
- "Add a note: 'Remember to update README' tagged with 'todo'"
- "Save this idea: 'Build a local RAG for ML notes' tagged 'idea' and 'ml'"

#### `notes.list`

Lists notes, optionally filtered by tag.

**Example prompts:**
- "Show all my notes"
- "List notes tagged 'todo'"

#### `notes.search`

Searches notes by text or tags.

**Example prompts:**
- "Search notes for 'RAG'"
- "Find notes mentioning 'LangGraph'"

Notes are stored in `~/.aashna_dev_mcp/notes.json`.

## 🔒 Safety Features

### Path Safety

All filesystem operations are constrained to `ALLOWED_ROOTS`. Attempts to access paths outside these roots will fail with a clear error.

### Command Safety

Dangerous command patterns are blocked:

- `rm -rf /` (root deletion)
- Fork bombs: `:(){ :|:& };:`
- Filesystem formatting: `mkfs`
- Direct disk writes: `dd if=...of=/dev/...`
- Piping downloads to shell: `curl ... | bash`

### Output Management

- Commands are automatically killed after timeout
- Output is truncated to prevent memory issues
- Structured error responses (no server crashes)

### Dry-Run Mode

Preview what a command would do without executing:

```json
{
  "command": "rm -rf dist/",
  "dry_run": true
}
```

## 🧪 Development

### Watch mode

```bash
npm run dev
```

Automatically rebuilds on file changes.

### Manual testing

Run the server directly:

```bash
npm start
```

Or:

```bash
node dist/index.js
```

The server communicates over stdio using the MCP protocol.

## 📝 Example Usage Scenarios

### Scenario 1: Explore and fix failing tests

**Prompt:** _"List all repositories in ~/dev, find the ones with uncommitted changes, then run tests on my-api-project and show me what's failing."_

The assistant will:
1. Use `project.list_repos` to find all repos
2. Use `git.status` on each to check for changes
3. Use `project.run_tests` on the specified repo
4. Parse and summarize test failures

### Scenario 2: Create a new project

**Prompt:** _"Create a new directory ~/dev/my-new-app with a basic package.json, .gitignore, and README."_

The assistant will:
1. Use `fs.write_file` to create each file
2. Populate them with sensible defaults
3. Optionally run `npm install` with `terminal.run_command`

### Scenario 3: Research and document

**Prompt:** _"Search my notes for anything about LangGraph, then add a new note summarizing what we learned today."_

The assistant will:
1. Use `notes.search` to find existing notes
2. Use `notes.add` to create a new note with appropriate tags

## 🔧 Extending the Server

### Adding a new tool

1. **Implement the tool function** in an appropriate file under `src/tools/`
2. **Export the function** and add JSDoc comments explaining usage
3. **Register the tool** in `src/index.ts`:
   - Add to `ListToolsRequestSchema` handler (tool metadata)
   - Add to `CallToolRequestSchema` handler (execution logic)
4. **Update types** in `src/core/types.ts` if needed
5. **Rebuild:** `npm run build`

### Configuring for other MCP clients

The server uses standard MCP over stdio, so it should work with any MCP-compatible client. Just update `mcp.config.json` with the client-specific configuration format.

## 🤝 Contributing

This is a personal project, but feel free to fork and customize for your own needs!

## 📄 License

MIT

---

**Built with:**
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- TypeScript
- Node.js

Happy coding! 🚀

