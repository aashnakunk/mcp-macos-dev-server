/**
 * macOS Chrome Browser tools.
 * 
 * These tools allow AI assistants to search Chrome browsing history
 * and open URLs in Google Chrome on macOS.
 */

import { execCommand } from "../core/exec.js";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

/**
 * Chrome history entry
 */
export interface HistoryEntry {
  title: string;
  url: string;
  last_visit: string; // ISO 8601 format
  visit_count: number;
}

/**
 * Result of searching Chrome history
 */
export interface HistorySearchResult {
  results: HistoryEntry[];
  total_found: number;
  searched_back_days: number;
}

/**
 * Result of opening a URL
 */
export interface OpenUrlResult {
  success: boolean;
  message?: string;
}

/**
 * Converts Chrome's WebKit timestamp to ISO 8601 string.
 * 
 * Chrome stores timestamps as microseconds since January 1, 1601 (WebKit epoch).
 * We need to convert to Unix epoch (milliseconds since Jan 1, 1970).
 * 
 * @param chromeTime - Chrome timestamp in microseconds since WebKit epoch
 * @returns ISO 8601 formatted date string
 */
function chromeTimeToISO(chromeTime: number): string {
  // WebKit epoch (Jan 1, 1601) to Unix epoch (Jan 1, 1970) = 11644473600 seconds
  const WEBKIT_TO_UNIX_OFFSET = 11644473600;
  
  // Convert microseconds to seconds, subtract offset, then convert to milliseconds
  const unixTimestampMs = (chromeTime / 1000000 - WEBKIT_TO_UNIX_OFFSET) * 1000;
  
  return new Date(unixTimestampMs).toISOString();
}

/**
 * Gets the path to Chrome's history database.
 * 
 * @returns Path to Chrome History SQLite database
 */
function getChromeHistoryPath(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, "Library", "Application Support", "Google", "Chrome", "Default", "History");
}

/**
 * Searches recent Chrome browsing history.
 * 
 * **When to use this tool:**
 * - "Find the YouTube video about reinforcement learning I watched yesterday"
 * - "Search my recent history for 'MCP tutorial'"
 * - "What sites about TypeScript have I visited this week?"
 * 
 * @param query - Search text to match in title OR URL
 * @param days - Number of days to look back (default: 3)
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Search results with matching history entries
 */
export async function searchRecentHistory(
  query: string,
  days: number = 3,
  limit: number = 10
): Promise<HistorySearchResult> {
  try {
    // Check if Chrome history file exists
    const historyPath = getChromeHistoryPath();
    
    if (!fs.existsSync(historyPath)) {
      throw new Error(
        `Chrome history database not found at: ${historyPath}\n` +
        "Make sure Google Chrome is installed and has been used at least once."
      );
    }
    
    // Calculate timestamp for X days ago
    const now = Date.now();
    const daysAgoMs = now - (days * 24 * 60 * 60 * 1000);
    
    // Convert to Chrome's WebKit timestamp format (microseconds since Jan 1, 1601)
    const WEBKIT_TO_UNIX_OFFSET = 11644473600;
    const chromeTimestamp = (daysAgoMs / 1000 + WEBKIT_TO_UNIX_OFFSET) * 1000000;
    
    // Escape the query for SQL LIKE and shell
    const escapedQuery = `%${query.replace(/'/g, "''")}%`;
    
    // Build SQL query
    // Note: We use a copy of the database because Chrome might have it locked
    const sqlQuery = `
      SELECT url, title, last_visit_time, visit_count
      FROM urls
      WHERE (title LIKE '${escapedQuery}' OR url LIKE '${escapedQuery}')
        AND last_visit_time > ${chromeTimestamp}
      ORDER BY last_visit_time DESC
      LIMIT ${limit}
    `.trim();
    
    // Create a temporary copy of the history file (Chrome might have it locked)
    const tempHistoryPath = `/tmp/chrome_history_copy_${Date.now()}.db`;
    const copyCommand = `cp "${historyPath}" "${tempHistoryPath}"`;
    const copyResult = await execCommand({
      command: copyCommand,
      timeout_seconds: 5,
    });
    
    if (copyResult.exit_code !== 0) {
      throw new Error(`Failed to copy Chrome history: ${copyResult.stderr}`);
    }
    
    try {
      // Query the database
      const queryCommand = `sqlite3 "${tempHistoryPath}" "${sqlQuery}" -separator '|'`;
      const result = await execCommand({
        command: queryCommand,
        timeout_seconds: 10,
        max_output_chars: 100000,
      });
      
      if (result.exit_code !== 0) {
        throw new Error(`SQLite query failed: ${result.stderr}`);
      }
      
      // Parse results
      const results: HistoryEntry[] = [];
      const lines = result.stdout.trim().split('\n').filter(line => line.length > 0);
      
      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length >= 4) {
          const [url, title, lastVisitTime, visitCount] = parts;
          
          results.push({
            url: url || '(no URL)',
            title: title || '(no title)',
            last_visit: chromeTimeToISO(parseInt(lastVisitTime, 10)),
            visit_count: parseInt(visitCount, 10) || 0,
          });
        }
      }
      
      return {
        results,
        total_found: results.length,
        searched_back_days: days,
      };
    } finally {
      // Clean up temporary file
      try {
        fs.unlinkSync(tempHistoryPath);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to search Chrome history: ${error.message}`);
  }
}

/**
 * Opens a URL in Google Chrome.
 * 
 * **When to use this tool:**
 * - "Open that YouTube video in Chrome"
 * - "Launch this URL: https://example.com"
 * - "Open the first search result in my browser"
 * 
 * @param url - URL to open (must start with http:// or https://)
 * @returns Success status and message
 */
export async function openUrl(url: string): Promise<OpenUrlResult> {
  try {
    // Validate URL starts with http:// or https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return {
        success: false,
        message: `Invalid URL: must start with http:// or https://. Got: ${url}`,
      };
    }
    
    // Escape single quotes in the URL for AppleScript
    const escapedUrl = url.replace(/'/g, "'\\''");
    
    // Use osascript to tell Chrome to open the URL
    const command = `osascript -e 'tell application "Google Chrome" to open location "${escapedUrl}"'`;
    
    const result = await execCommand({
      command,
      timeout_seconds: 10,
    });
    
    if (result.exit_code !== 0) {
      return {
        success: false,
        message: `Failed to open URL: ${result.stderr || 'Unknown error'}`,
      };
    }
    
    return {
      success: true,
      message: `Successfully opened ${url} in Google Chrome`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error opening URL: ${error.message}`,
    };
  }
}

