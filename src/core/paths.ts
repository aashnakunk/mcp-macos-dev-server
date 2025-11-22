/**
 * Path safety utilities.
 * 
 * These functions ensure that filesystem operations only access allowed directories,
 * preventing accidental access to sensitive system files.
 */

import * as path from "path";
import * as fs from "fs";
import { ALLOWED_ROOTS } from "../config.js";

/**
 * Resolves a path to an absolute path and ensures it's within allowed roots.
 * 
 * @param inputPath - The path to resolve (can be relative or absolute)
 * @param basePath - Optional base path for relative resolution (defaults to cwd)
 * @returns The resolved absolute path
 * @throws Error if the path is outside allowed roots
 */
export function resolveSafePath(inputPath: string, basePath?: string): string {
  // Resolve to absolute path
  const base = basePath || process.cwd();
  const resolved = path.resolve(base, inputPath);
  
  // Check if the resolved path is under any allowed root
  const isAllowed = ALLOWED_ROOTS.some((root) => {
    const normalizedRoot = path.resolve(root);
    return resolved.startsWith(normalizedRoot);
  });
  
  if (!isAllowed) {
    throw new Error(
      `Access denied: Path "${resolved}" is outside allowed roots.\n` +
      `Allowed roots: ${ALLOWED_ROOTS.join(", ")}`
    );
  }
  
  return resolved;
}

/**
 * Checks if a path exists and is a directory.
 * 
 * @param dirPath - The path to check
 * @returns True if the path exists and is a directory
 */
export function isDirectory(dirPath: string): boolean {
  try {
    const stats = fs.statSync(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Checks if a path exists and is a file.
 * 
 * @param filePath - The path to check
 * @returns True if the path exists and is a file
 */
export function isFile(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Recursively finds all directories containing a specific marker file/folder.
 * 
 * @param rootPath - The root directory to start searching from
 * @param marker - The marker file/folder to look for (e.g., ".git")
 * @param maxDepth - Maximum depth to search
 * @param currentDepth - Current recursion depth (internal)
 * @returns Array of directory paths containing the marker
 */
export function findDirectoriesWithMarker(
  rootPath: string,
  marker: string,
  maxDepth: number,
  currentDepth: number = 0
): string[] {
  const results: string[] = [];
  
  if (currentDepth > maxDepth) {
    return results;
  }
  
  try {
    // Check if marker exists in current directory
    const markerPath = path.join(rootPath, marker);
    if (fs.existsSync(markerPath)) {
      results.push(rootPath);
      // Don't recurse into subdirectories if we found a marker
      return results;
    }
    
    // Recursively search subdirectories
    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        const subPath = path.join(rootPath, entry.name);
        const subResults = findDirectoriesWithMarker(
          subPath,
          marker,
          maxDepth,
          currentDepth + 1
        );
        results.push(...subResults);
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }
  
  return results;
}

