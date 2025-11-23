# Configuration Guide

This guide explains how to configure `aashna-dev-mcp` for your system or to share with others.

## ✅ What's NOT Hardcoded (Portable)

The server is designed to work on **any macOS system** without modification:

1. **All paths use `os.homedir()`** - automatically uses the current user's home directory
2. **Tools accept paths as parameters** - you specify directories when you ask
3. **Configuration via environment variables** - flexible per-user setup
4. **macOS system tools** - ping, lsof, ps, etc. are standard on all Macs

## 🔧 Configuring Allowed Directories

### Option 1: Environment Variable (Recommended)

Set `MCP_ALLOWED_ROOTS` in your MCP client config:

```json
{
  "mcpServers": {
    "aashna-dev-mcp": {
      "command": "node",
      "args": ["/path/to/mcp_aashna/dist/index.js"],
      "env": {
        "MCP_ALLOWED_ROOTS": "~/dev,~/projects,~/code,~/Documents"
      }
    }
  }
}
```

**Path formats supported:**
- `~/dev` - Expands to `/Users/yourname/dev`
- `/absolute/path` - Use as-is
- `relative/path` - Resolved from current directory

### Option 2: Edit config.ts (For permanent changes)

Edit `src/config.ts` and modify the defaults:

```typescript
return [
  path.join(os.homedir(), "my-custom-folder"),
  path.join(os.homedir(), "another-folder"),
];
```

Then rebuild:
```bash
npm run build
```

## 📂 How Directory Access Works

### Safety Boundaries

`ALLOWED_ROOTS` defines the **boundaries** where filesystem tools can operate:
- ✅ `fs_read_file`, `fs_write_file`, `fs_list_dir` - Must be within allowed roots
- ✅ `project_list_repos` - Must start search within allowed roots
- ✅ Git tools - Repos must be within allowed roots

### Specifying Directories

**You always specify the exact directory when asking:**

❌ **Wrong assumption:** "It only checks ~/projects"

✅ **Reality:** You specify the directory each time:

```
Example prompts:
- "List repos in ~/code"           → Checks ~/code
- "List repos in ~/dev"             → Checks ~/dev  
- "Show git status of ~/work/myapp" → Checks ~/work/myapp
```

**The tools are flexible!** The path you specify just needs to be within an allowed root.

### Example Flow

1. **Your config allows:** `~/dev`, `~/projects`, `~/Documents`
2. **You ask:** "List git repos in ~/projects/work"
3. **Server checks:** Is `~/projects/work` under `~/projects`? ✅ Yes!
4. **Result:** Lists repos in `~/projects/work`

If you asked about `~/secret-files`, it would be **rejected** (not in allowed roots).

## 🚀 Sharing with Others

When sharing this code:

### 1. Tell them to configure their own paths

Share the `mcp.config.example.json`:

```json
{
  "mcpServers": {
    "aashna-dev-mcp": {
      "command": "node",
      "args": ["/path/to/their/clone/dist/index.js"],
      "env": {
        "MCP_ALLOWED_ROOTS": "~/their-dev,~/their-projects"
      }
    }
  }
}
```

### 2. Default folders work on any Mac

If they don't set `MCP_ALLOWED_ROOTS`, the defaults are:
- `~/dev`
- `~/projects`
- `~/code`
- `~/workspace`
- `~/Desktop`
- `~/Documents`
- `~/Downloads`

These folder names are common, and paths use `~` so they work for any user.

### 3. Installation steps

```bash
# Clone
git clone https://github.com/aashnakunk/mcp-macos-dev-server.git
cd mcp-macos-dev-server

# Install & build
npm install
npm run build

# Configure
# Edit ~/.../Claude/claude_desktop_config.json
# Set the path to YOUR dist/index.js
# Optionally set MCP_ALLOWED_ROOTS

# Restart Claude Desktop
```

## 🔐 Security Notes

**Why allowed roots?**

Prevents accidental access to:
- System files (`/System`, `/Library`)
- Other users' home directories
- Sensitive config files

**What if I need access to other directories?**

Just add them to `MCP_ALLOWED_ROOTS`:

```json
"env": {
  "MCP_ALLOWED_ROOTS": "~/dev,~/projects,/opt/myapp,/var/data"
}
```

## 🎯 Tool-Specific Paths

### Git Tools
```
git_status: Takes repo_path parameter
git_log: Takes repo_path parameter
git_commit: Takes repo_path parameter
```

**You specify the repo each time:**
- "Check git status of ~/dev/my-app"
- "Show git log for ~/projects/api-server"

### Project Tools
```
project_list_repos: Takes root_path parameter
project_detect_stack: Takes repo_path parameter
project_run_tests: Takes repo_path parameter
```

**Examples:**
- "List repos in ~/code"
- "What's the tech stack of ~/projects/web-app?"

### Filesystem Tools
```
fs_list_dir: Takes path parameter
fs_read_file: Takes path parameter
fs_write_file: Takes path parameter
```

**Completely flexible!**
- "List files in ~/Downloads"
- "Read ~/Documents/notes.txt"
- "Write to ~/dev/config.json"

## 💡 Best Practices

1. **Keep allowed roots broad but safe**
   - Include your development directories
   - Exclude system directories
   - Add specific project dirs if needed

2. **Use environment variables**
   - Different per user
   - Easy to update without rebuilding
   - Can be different per MCP client

3. **Document for your team**
   - Include your team's standard folders
   - Provide a ready-to-use config example
   - Explain what directories they need access to

## ❓ FAQ

**Q: Can different users have different folders?**  
A: Yes! Each user sets `MCP_ALLOWED_ROOTS` in their config.

**Q: What if I ask about a folder outside allowed roots?**  
A: You'll get a clear error: "Access denied: Path is outside allowed roots."

**Q: Do macOS tools (Calendar, Notes, etc.) need configuration?**  
A: No! They use macOS APIs and work automatically.

**Q: Can I use relative paths?**  
A: Yes, they're resolved to absolute paths and checked against allowed roots.

**Q: Is the notes storage portable?**  
A: Yes! It's in `~/.aashna_dev_mcp/notes.json` - automatically created per user.

---

**Summary:** The server is fully portable! Just set `MCP_ALLOWED_ROOTS` to your directories, and you're good to go. 🚀

