# Quick Start Guide

## ✅ Your server is ready!

The `aashna-dev-mcp` server has been successfully built and is ready to use.

## 🚀 Next Steps

### 1. Test the server locally

```bash
npm start
```

You should see: `aashna-dev-mcp server running on stdio`

Press `Ctrl+C` to stop.

### 2. Configure for use with Claude Desktop (or other MCP clients)

#### For Claude Desktop on macOS:

1. Open or create: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. Add this configuration:

```json
{
  "mcpServers": {
    "aashna-dev-mcp": {
      "command": "node",
      "args": [
        "/Users/aashnakunkolienker/projects/mcp_aashna/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

3. Restart Claude Desktop

#### For other MCP clients:

Use the same configuration format, adjusted for your client's config location.

### 3. Verify it's working

In your MCP client (e.g., Claude Desktop), try asking:

> "Can you list the tools you have available from aashna-dev-mcp?"

You should see 15 tools:
- `terminal.run_command`
- `fs.list_dir`, `fs.read_file`, `fs.write_file`, `fs.append_file`
- `git.status`, `git.log`, `git.commit`, `git.push`
- `project.list_repos`, `project.detect_stack`, `project.run_tests`
- `notes.add`, `notes.list`, `notes.search`

### 4. Try some example prompts

**Explore your projects:**
> "List all git repositories in ~/dev and tell me which ones have uncommitted changes"

**Run tests:**
> "Detect the tech stack in ~/projects/my-app and run the tests"

**Take notes:**
> "Add a note: 'Remember to update documentation' tagged with 'todo'"

**Read and analyze code:**
> "Read the package.json from my-project and tell me what frameworks it uses"

## 🔧 Important: Configure Allowed Roots

Before using the server, edit `src/config.ts` to set your allowed directories:

```typescript
export const ALLOWED_ROOTS = [
  path.join(os.homedir(), "dev"),
  path.join(os.homedir(), "projects"),
  // Add your development directories here
];
```

Then rebuild:

```bash
npm run build
```

## 📚 Need Help?

- See [README.md](./README.md) for full documentation
- Check tool descriptions with: `cat src/index.ts | grep "description:"`
- Review safety features in `src/config.ts`

## 🛠️ Development

**Watch mode (auto-rebuild on changes):**
```bash
npm run dev
```

**Clean build:**
```bash
npm run clean
npm run build
```

---

Happy coding! 🎉

