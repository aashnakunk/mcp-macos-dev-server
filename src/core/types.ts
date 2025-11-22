/**
 * Shared type definitions for the aashna-dev-mcp server.
 */

/**
 * Result of executing a shell command
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  cwd: string;
  truncated: boolean;
  warning?: string;
}

/**
 * Options for executing a shell command
 */
export interface CommandOptions {
  command: string;
  cwd?: string;
  timeout_seconds?: number;
  max_output_chars?: number;
  dry_run?: boolean;
}

/**
 * Directory entry returned by filesystem tools
 */
export interface DirectoryEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number | null;
  modified?: string | null;
}

/**
 * Result of reading a file
 */
export interface FileReadResult {
  content: string;
  encoding: "utf-8";
  truncated: boolean;
}

/**
 * Result of writing a file
 */
export interface FileWriteResult {
  success: boolean;
  bytes_written: number;
}

/**
 * Git commit information
 */
export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

/**
 * Detected technology stack information
 */
export interface TechStack {
  language?: string;
  frameworks: string[];
  test_command?: string;
  dev_command?: string;
  notes?: string;
}

/**
 * A note entry
 */
export interface Note {
  id: string;
  text: string;
  tags: string[];
  created_at: string;
}

/**
 * Repository information
 */
export interface RepoInfo {
  path: string;
  name: string;
}

/**
 * Generic error response structure
 */
export interface ErrorResponse {
  error: string;
  details?: string;
}

