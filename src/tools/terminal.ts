/**
 * Terminal tools for executing shell commands.
 * 
 * These tools allow an AI assistant to run shell commands on your behalf,
 * with safety guardrails and output management.
 */

import { execCommand } from "../core/exec.js";
import type { CommandResult, CommandOptions } from "../core/types.js";

/**
 * Runs a shell command in a specified directory.
 * 
 * **When to use this tool:**
 * - Running build commands (npm run build, cargo build)
 * - Installing dependencies (npm install, pip install -r requirements.txt)
 * - Checking system state (ls, ps, df)
 * - Running development servers or scripts
 * 
 * **Safety features:**
 * - Commands with dangerous patterns (rm -rf /, fork bombs) are blocked
 * - Output is truncated to prevent overwhelming responses
 * - Timeouts prevent runaway processes
 * - Dry-run mode allows previewing what would be executed
 * 
 * @param options - Command execution options
 * @returns Command execution result with stdout, stderr, exit code, and metadata
 */
export async function runCommand(
  options: CommandOptions
): Promise<CommandResult> {
  return execCommand(options);
}

