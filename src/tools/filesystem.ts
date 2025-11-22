/**
 * Filesystem tools for reading, writing, and exploring files.
 * 
 * These tools provide safe filesystem access within configured allowed roots.
 * All operations validate paths against ALLOWED_ROOTS to prevent unauthorized access.
 */

import * as fs from "fs/promises";
import * as path from "path";
import { resolveSafePath, isDirectory, isFile } from "../core/paths.js";
import type {
  DirectoryEntry,
  FileReadResult,
  FileWriteResult,
} from "../core/types.js";
import { DEFAULT_MAX_FILE_BYTES } from "../config.js";

/**
 * Lists entries in a directory.
 * 
 * **When to use this tool:**
 * - Exploring a project structure
 * - Finding specific files or folders
 * - Checking if files exist
 * 
 * @param dirPath - Path to the directory to list
 * @returns Array of directory entries with metadata
 * @throws Error if path is outside allowed roots or not a directory
 */
export async function listDirectory(dirPath: string): Promise<{
  entries: DirectoryEntry[];
}> {
  const safePath = resolveSafePath(dirPath);
  
  if (!isDirectory(safePath)) {
    throw new Error(`Path is not a directory: ${dirPath}`);
  }
  
  const entries = await fs.readdir(safePath, { withFileTypes: true });
  const result: DirectoryEntry[] = [];
  
  for (const entry of entries) {
    const fullPath = path.join(safePath, entry.name);
    let size: number | null = null;
    let modified: string | null = null;
    
    try {
      const stats = await fs.stat(fullPath);
      size = entry.isFile() ? stats.size : null;
      modified = stats.mtime.toISOString();
    } catch {
      // If we can't stat, just skip the metadata
    }
    
    result.push({
      name: entry.name,
      path: fullPath,
      is_dir: entry.isDirectory(),
      size,
      modified,
    });
  }
  
  return { entries: result };
}

/**
 * Reads the contents of a file.
 * 
 * **When to use this tool:**
 * - Reading configuration files
 * - Inspecting source code
 * - Analyzing log files
 * - Checking file contents before modifying
 * 
 * @param filePath - Path to the file to read
 * @param maxBytes - Maximum bytes to read (default: 100,000)
 * @returns File contents with metadata
 * @throws Error if path is outside allowed roots or not a file
 */
export async function readFile(
  filePath: string,
  maxBytes: number = DEFAULT_MAX_FILE_BYTES
): Promise<FileReadResult> {
  const safePath = resolveSafePath(filePath);
  
  if (!isFile(safePath)) {
    throw new Error(`Path is not a file: ${filePath}`);
  }
  
  const stats = await fs.stat(safePath);
  const fileSize = stats.size;
  
  if (fileSize <= maxBytes) {
    // Read entire file
    const content = await fs.readFile(safePath, "utf-8");
    return {
      content,
      encoding: "utf-8",
      truncated: false,
    };
  } else {
    // Read truncated
    const buffer = Buffer.alloc(maxBytes);
    const fd = await fs.open(safePath, "r");
    await fd.read(buffer, 0, maxBytes, 0);
    await fd.close();
    
    const content =
      buffer.toString("utf-8") +
      `\n\n... [File truncated: showing ${maxBytes} of ${fileSize} bytes] ...`;
    
    return {
      content,
      encoding: "utf-8",
      truncated: true,
    };
  }
}

/**
 * Writes content to a file.
 * 
 * **When to use this tool:**
 * - Creating new files
 * - Updating configuration
 * - Saving generated code or data
 * - Creating scripts or documentation
 * 
 * @param filePath - Path to the file to write
 * @param content - Content to write
 * @param overwrite - Whether to overwrite if file exists (default: true)
 * @returns Write result with success status and bytes written
 * @throws Error if path is outside allowed roots or overwrite is false and file exists
 */
export async function writeFile(
  filePath: string,
  content: string,
  overwrite: boolean = true
): Promise<FileWriteResult> {
  const safePath = resolveSafePath(filePath);
  
  // Check if file exists and overwrite is false
  if (!overwrite && isFile(safePath)) {
    throw new Error(
      `File already exists and overwrite=false: ${filePath}`
    );
  }
  
  // Ensure parent directory exists
  const parentDir = path.dirname(safePath);
  await fs.mkdir(parentDir, { recursive: true });
  
  // Write the file
  await fs.writeFile(safePath, content, "utf-8");
  const bytesWritten = Buffer.byteLength(content, "utf-8");
  
  return {
    success: true,
    bytes_written: bytesWritten,
  };
}

/**
 * Appends content to a file.
 * 
 * **When to use this tool:**
 * - Adding to log files
 * - Appending data without overwriting
 * - Incrementally building files
 * 
 * @param filePath - Path to the file to append to
 * @param content - Content to append
 * @returns Append result with success status and bytes written
 * @throws Error if path is outside allowed roots
 */
export async function appendFile(
  filePath: string,
  content: string
): Promise<FileWriteResult> {
  const safePath = resolveSafePath(filePath);
  
  // Ensure parent directory exists
  const parentDir = path.dirname(safePath);
  await fs.mkdir(parentDir, { recursive: true });
  
  // Append to the file
  await fs.appendFile(safePath, content, "utf-8");
  const bytesWritten = Buffer.byteLength(content, "utf-8");
  
  return {
    success: true,
    bytes_written: bytesWritten,
  };
}

