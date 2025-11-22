/**
 * Safe command execution utilities.
 * 
 * This module provides a wrapper around child_process.exec with safety features:
 * - Command blacklisting (dangerous patterns)
 * - Timeout handling
 * - Output truncation
 * - Dry-run mode
 */

import { exec } from "child_process";
import { promisify } from "util";
import type { CommandResult, CommandOptions } from "./types.js";
import {
  DEFAULT_COMMAND_TIMEOUT,
  DEFAULT_MAX_OUTPUT_CHARS,
  DANGEROUS_PATTERNS,
} from "../config.js";

const execAsync = promisify(exec);

/**
 * Checks if a command contains dangerous patterns.
 * 
 * @param command - The command to check
 * @returns An error message if dangerous, undefined otherwise
 */
function checkCommandSafety(command: string): string | undefined {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return `Command blocked: potentially dangerous pattern detected (${pattern})`;
    }
  }
  return undefined;
}

/**
 * Truncates output to a maximum length.
 * 
 * @param output - The output to truncate
 * @param maxChars - Maximum number of characters
 * @returns Truncated output and whether truncation occurred
 */
function truncateOutput(
  output: string,
  maxChars: number
): { truncated: string; wasTruncated: boolean } {
  if (output.length <= maxChars) {
    return { truncated: output, wasTruncated: false };
  }
  
  const half = Math.floor(maxChars / 2);
  const truncated =
    output.slice(0, half) +
    "\n\n... [output truncated] ...\n\n" +
    output.slice(-half);
  
  return { truncated, wasTruncated: true };
}

/**
 * Executes a shell command with safety features and options.
 * 
 * @param options - Command execution options
 * @returns Result of the command execution
 */
export async function execCommand(
  options: CommandOptions
): Promise<CommandResult> {
  const {
    command,
    cwd = process.cwd(),
    timeout_seconds = DEFAULT_COMMAND_TIMEOUT,
    max_output_chars = DEFAULT_MAX_OUTPUT_CHARS,
    dry_run = false,
  } = options;
  
  // Check for dangerous patterns
  const safetyWarning = checkCommandSafety(command);
  if (safetyWarning) {
    return {
      stdout: "",
      stderr: "",
      exit_code: -1,
      timed_out: false,
      cwd,
      truncated: false,
      warning: safetyWarning,
    };
  }
  
  // Dry run mode
  if (dry_run) {
    return {
      stdout: "",
      stderr: "",
      exit_code: 0,
      timed_out: false,
      cwd,
      truncated: false,
      warning: `[DRY RUN] Would execute: ${command} (in ${cwd})`,
    };
  }
  
  // Execute the command
  let timedOut = false;
  let stdout = "";
  let stderr = "";
  let exitCode = 0;
  
  try {
    const result = await execAsync(command, {
      cwd,
      timeout: timeout_seconds * 1000,
      maxBuffer: max_output_chars * 2, // Give some headroom before Node.js kills it
    });
    
    stdout = result.stdout || "";
    stderr = result.stderr || "";
  } catch (err: any) {
    // Handle timeout
    if (err.killed || err.signal === "SIGTERM") {
      timedOut = true;
      stderr = `Command timed out after ${timeout_seconds} seconds`;
    } else {
      // Command executed but returned non-zero exit code
      stdout = err.stdout || "";
      stderr = err.stderr || err.message || "Unknown error";
      exitCode = err.code ?? 1;
    }
  }
  
  // Truncate output if needed
  const stdoutResult = truncateOutput(stdout, max_output_chars);
  const stderrResult = truncateOutput(stderr, max_output_chars);
  const wasTruncated = stdoutResult.wasTruncated || stderrResult.wasTruncated;
  
  return {
    stdout: stdoutResult.truncated,
    stderr: stderrResult.truncated,
    exit_code: exitCode,
    timed_out: timedOut,
    cwd,
    truncated: wasTruncated,
  };
}

