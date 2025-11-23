/**
 * macOS Clipboard tools.
 * 
 * These tools allow AI assistants to interact with the system clipboard,
 * enabling copy/paste workflows and clipboard management.
 */

import { execCommand } from "../core/exec.js";

/**
 * Copies text to the clipboard.
 * 
 * **When to use this tool:**
 * - "Copy this to my clipboard"
 * - "Put this command on my clipboard"
 * - "Save this snippet to clipboard"
 * 
 * @param text - Text to copy to clipboard
 * @returns Success confirmation
 */
export async function copyToClipboard(text: string): Promise<{
  success: boolean;
  chars_copied: number;
}> {
  const result = await execCommand({
    command: `echo '${text.replace(/'/g, "'\\''")}' | pbcopy`,
    timeout_seconds: 5,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to copy to clipboard: ${result.stderr}`);
  }
  
  return {
    success: true,
    chars_copied: text.length,
  };
}

/**
 * Reads text from the clipboard.
 * 
 * **When to use this tool:**
 * - "What's on my clipboard?"
 * - "Parse the text I just copied"
 * - "Analyze what's in my clipboard"
 * 
 * @returns Clipboard contents
 */
export async function readFromClipboard(): Promise<{
  content: string;
  chars_read: number;
}> {
  const result = await execCommand({
    command: "pbpaste",
    timeout_seconds: 5,
    max_output_chars: 100000,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to read from clipboard: ${result.stderr}`);
  }
  
  return {
    content: result.stdout,
    chars_read: result.stdout.length,
  };
}

/**
 * Clears the clipboard.
 * 
 * **When to use this tool:**
 * - "Clear my clipboard"
 * - "Empty clipboard"
 * 
 * @returns Success confirmation
 */
export async function clearClipboard(): Promise<{
  success: boolean;
}> {
  const result = await execCommand({
    command: "echo '' | pbcopy",
    timeout_seconds: 5,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to clear clipboard: ${result.stderr}`);
  }
  
  return {
    success: true,
  };
}

