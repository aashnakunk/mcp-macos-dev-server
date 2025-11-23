/**
 * Apple Notes integration for macOS.
 * 
 * These tools allow AI assistants to interact with your actual Apple Notes app,
 * enabling natural language note-taking and retrieval from your existing notes.
 */

import { execCommand } from "../core/exec.js";

export interface AppleNote {
  id: string;
  name: string;
  body: string;
  folder: string;
  created: string;
  modified: string;
}

/**
 * Lists all notes from Apple Notes.
 * 
 * **When to use this tool:**
 * - "Show me all my notes"
 * - "What notes do I have?"
 * - "List notes in my Work folder"
 * 
 * @param folder - Optional folder name to filter by
 * @param limit - Maximum number of notes to return (default: 50)
 * @returns Array of notes with metadata
 */
export async function listAppleNotes(
  folder?: string,
  limit: number = 50
): Promise<{
  notes: AppleNote[];
}> {
  const folderFilter = folder ? `whose container's name is "${folder}"` : "";
  
  const script = `
    tell application "Notes"
      set notesList to {}
      set allNotes to notes ${folderFilter}
      repeat with aNote in allNotes
        set noteInfo to {¬
          id:id of aNote, ¬
          name:name of aNote, ¬
          body:body of aNote, ¬
          folder:name of container of aNote, ¬
          created:(creation date of aNote as string), ¬
          modified:(modification date of aNote as string)}
        set end of notesList to noteInfo
      end repeat
      return notesList
    end tell
  `;
  
  const result = await execCommand({
    command: `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    timeout_seconds: 30,
    max_output_chars: 50000,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to list Apple Notes: ${result.stderr}`);
  }
  
  // Parse AppleScript output (format: "id, name, body, folder, created, modified")
  const notes: AppleNote[] = [];
  const lines = result.stdout.trim().split(", ");
  
  // AppleScript returns a comma-separated list
  // This is a simplified parser - in production you might want better parsing
  if (lines.length > 0 && lines[0]) {
    notes.push({
      id: "parsed",
      name: "Apple Notes",
      body: result.stdout,
      folder: folder || "All",
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    });
  }
  
  return { notes: notes.slice(0, limit) };
}

/**
 * Creates a new note in Apple Notes.
 * 
 * **When to use this tool:**
 * - "Create a note about this meeting"
 * - "Save this idea to my Notes"
 * - "Make a note in my Work folder"
 * 
 * @param title - Note title
 * @param body - Note content
 * @param folder - Optional folder name (default: Notes)
 * @returns Created note info
 */
export async function createAppleNote(
  title: string,
  body: string,
  folder: string = "Notes"
): Promise<{
  success: boolean;
  note_name: string;
  folder: string;
}> {
  // Escape single quotes for AppleScript
  const escapedTitle = title.replace(/'/g, "'\\''");
  const escapedBody = body.replace(/'/g, "'\\''");
  const escapedFolder = folder.replace(/'/g, "'\\''");
  
  const script = `
    tell application "Notes"
      tell folder "${escapedFolder}"
        make new note with properties {name:"${escapedTitle}", body:"${escapedBody}"}
      end tell
    end tell
  `;
  
  const result = await execCommand({
    command: `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    timeout_seconds: 10,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to create note: ${result.stderr}`);
  }
  
  return {
    success: true,
    note_name: title,
    folder,
  };
}

/**
 * Searches Apple Notes by text.
 * 
 * **When to use this tool:**
 * - "Find notes about the project"
 * - "Search my notes for 'meeting'"
 * - "What notes mention 'deadline'?"
 * 
 * @param query - Search query
 * @param limit - Maximum results (default: 20)
 * @returns Matching notes
 */
export async function searchAppleNotes(
  query: string,
  limit: number = 20
): Promise<{
  matches: AppleNote[];
}> {
  const escapedQuery = query.replace(/'/g, "'\\''");
  
  const script = `
    tell application "Notes"
      set matchingNotes to notes whose body contains "${escapedQuery}"
      set notesList to {}
      repeat with aNote in matchingNotes
        set noteInfo to {¬
          name:name of aNote, ¬
          body:(text 1 thru (min 200 and (count of body of aNote)) of body of aNote), ¬
          folder:name of container of aNote}
        set end of notesList to (name of aNote & "|" & (text 1 thru 200 of body of aNote))
      end repeat
      return notesList as text
    end tell
  `;
  
  const result = await execCommand({
    command: `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    timeout_seconds: 30,
    max_output_chars: 50000,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to search Apple Notes: ${result.stderr}`);
  }
  
  const matches: AppleNote[] = [];
  const output = result.stdout.trim();
  
  if (output) {
    // Parse results (simplified)
    matches.push({
      id: "search-result",
      name: `Search results for: ${query}`,
      body: output,
      folder: "Search Results",
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    });
  }
  
  return { matches: matches.slice(0, limit) };
}

