/**
 * Configuration for the aashna-dev-mcp server.
 * 
 * This module defines allowed filesystem roots and other safety constraints
 * to prevent tools from accessing sensitive areas of your machine.
 */

import * as os from "os";
import * as path from "path";

/**
 * Allowed root directories for filesystem operations.
 * Tools will only be able to access files/folders within these roots.
 * 
 * Adjust these paths to match your development setup.
 */
export const ALLOWED_ROOTS = [
  path.join(os.homedir(), "dev"),
  path.join(os.homedir(), "projects"),
  path.join(os.homedir(), "Desktop"),
  path.join(os.homedir(), "Documents"),
];

/**
 * Default timeout for shell commands (in seconds)
 */
export const DEFAULT_COMMAND_TIMEOUT = 10;

/**
 * Maximum output length for shell commands (in characters)
 */
export const DEFAULT_MAX_OUTPUT_CHARS = 10_000;

/**
 * Maximum file size to read (in bytes)
 */
export const DEFAULT_MAX_FILE_BYTES = 100_000;

/**
 * Directory where notes are stored
 */
export const NOTES_DIR = path.join(os.homedir(), ".aashna_dev_mcp");
export const NOTES_FILE = path.join(NOTES_DIR, "notes.json");

/**
 * Dangerous command patterns that should be blocked
 */
export const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\/(?!\w)/,           // rm -rf / (but allow /Users/... etc)
  /:\(\)\{\s*:\|\:&\s*\};:/,        // fork bomb
  /mkfs/,                           // format filesystem
  /dd\s+if=.*of=\/dev/,             // write to device
  /> \/dev\/sd[a-z]/,               // write to disk device
  /curl.*\|\s*(?:bash|sh)/,        // curl to shell (potentially dangerous)
  /wget.*\|\s*(?:bash|sh)/,        // wget to shell
];

