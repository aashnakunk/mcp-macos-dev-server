/**
 * Git tools for version control operations.
 * 
 * These tools enable AI assistants to interact with git repositories,
 * checking status, viewing history, and making commits.
 */

import * as path from "path";
import * as fs from "fs";
import { execCommand } from "../core/exec.js";
import { resolveSafePath } from "../core/paths.js";
import type { GitCommit } from "../core/types.js";

/**
 * Verifies that a directory is a git repository.
 * 
 * @param repoPath - Path to check
 * @throws Error if not a git repository
 */
function ensureGitRepo(repoPath: string): void {
  const gitDir = path.join(repoPath, ".git");
  if (!fs.existsSync(gitDir)) {
    throw new Error(`Not a git repository: ${repoPath}`);
  }
}

/**
 * Gets the git status of a repository.
 * 
 * **When to use this tool:**
 * - Checking for uncommitted changes
 * - Seeing which files are staged
 * - Checking current branch
 * - Verifying clean working directory
 * 
 * @param repoPath - Path to the git repository
 * @returns Git status output
 */
export async function getGitStatus(repoPath: string): Promise<{
  status: string;
  resolved_path: string;
}> {
  const safePath = resolveSafePath(repoPath);
  ensureGitRepo(safePath);
  
  const result = await execCommand({
    command: "git status -sb",
    cwd: safePath,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Git status failed: ${result.stderr}`);
  }
  
  return { 
    status: result.stdout,
    resolved_path: safePath
  };
}

/**
 * Gets the commit history of a repository.
 * 
 * **When to use this tool:**
 * - Reviewing recent changes
 * - Finding when a feature was added
 * - Checking who made specific changes
 * - Understanding project history
 * 
 * @param repoPath - Path to the git repository
 * @param maxCommits - Maximum number of commits to retrieve (default: 10)
 * @returns Array of commit information
 */
export async function getGitLog(
  repoPath: string,
  maxCommits: number = 10
): Promise<{
  commits: GitCommit[];
}> {
  const safePath = resolveSafePath(repoPath);
  ensureGitRepo(safePath);
  
  const result = await execCommand({
    command: `git log -n ${maxCommits} --pretty=format:"%H|%an|%aI|%s"`,
    cwd: safePath,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Git log failed: ${result.stderr}`);
  }
  
  const commits: GitCommit[] = [];
  const lines = result.stdout.trim().split("\n");
  
  for (const line of lines) {
    if (!line) continue;
    
    const [hash, author, date, ...messageParts] = line.split("|");
    commits.push({
      hash: hash || "",
      author: author || "",
      date: date || "",
      message: messageParts.join("|") || "",
    });
  }
  
  return { commits };
}

/**
 * Creates a git commit.
 * 
 * **When to use this tool:**
 * - Committing code changes
 * - Saving work progress
 * - Creating a checkpoint in development
 * 
 * **Note:** This is a write operation. The AI should confirm with the user
 * or be very confident about the commit message before using this.
 * 
 * @param repoPath - Path to the git repository
 * @param message - Commit message
 * @param addAll - Whether to stage all changes first (default: true)
 * @returns Commit result
 */
export async function createGitCommit(
  repoPath: string,
  message: string,
  addAll: boolean = true
): Promise<{
  success: boolean;
  output: string;
}> {
  const safePath = resolveSafePath(repoPath);
  ensureGitRepo(safePath);
  
  let output = "";
  
  // Stage all changes if requested
  if (addAll) {
    const addResult = await execCommand({
      command: "git add -A",
      cwd: safePath,
    });
    
    if (addResult.exit_code !== 0) {
      return {
        success: false,
        output: `Failed to stage changes: ${addResult.stderr}`,
      };
    }
    
    output += "Staged all changes.\n";
  }
  
  // Create commit
  // Escape single quotes in commit message
  const escapedMessage = message.replace(/'/g, "'\\''");
  const commitResult = await execCommand({
    command: `git commit -m '${escapedMessage}'`,
    cwd: safePath,
  });
  
  output += commitResult.stdout + commitResult.stderr;
  
  return {
    success: commitResult.exit_code === 0,
    output,
  };
}

/**
 * Pushes commits to a remote repository.
 * 
 * **When to use this tool:**
 * - Pushing committed changes to remote
 * - Syncing local work to GitHub/GitLab
 * - Publishing changes
 * 
 * **Note:** This is a write operation that affects remote state.
 * The AI should be careful when using this tool.
 * 
 * @param repoPath - Path to the git repository
 * @param remote - Remote name (default: "origin")
 * @param branch - Branch name (default: "main")
 * @returns Push result
 */
export async function pushGitCommit(
  repoPath: string,
  remote: string = "origin",
  branch: string = "main"
): Promise<{
  success: boolean;
  output: string;
}> {
  const safePath = resolveSafePath(repoPath);
  ensureGitRepo(safePath);
  
  const result = await execCommand({
    command: `git push ${remote} ${branch}`,
    cwd: safePath,
    timeout_seconds: 30, // Push might take longer
  });
  
  return {
    success: result.exit_code === 0,
    output: result.stdout + result.stderr,
  };
}

