/**
 * Personal notes tools for capturing and retrieving quick notes.
 * 
 * These tools provide a simple local notes system that an AI assistant
 * can use to help you remember ideas, TODOs, and snippets.
 */

import * as fs from "fs/promises";
import * as fsSync from "fs";
import { randomUUID } from "crypto";
import type { Note } from "../core/types.js";
import { NOTES_DIR, NOTES_FILE } from "../config.js";

/**
 * Storage for notes with debounced writes
 */
class NotesStore {
  private notes: Note[] = [];
  private writeTimeout: NodeJS.Timeout | null = null;
  private loaded: boolean = false;
  
  /**
   * Ensures the notes file is loaded into memory
   */
  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    
    try {
      // Create notes directory if it doesn't exist
      await fs.mkdir(NOTES_DIR, { recursive: true });
      
      // Load existing notes if file exists
      if (fsSync.existsSync(NOTES_FILE)) {
        const data = await fs.readFile(NOTES_FILE, "utf-8");
        this.notes = JSON.parse(data);
      }
    } catch (err) {
      // If file is corrupted or doesn't exist, start fresh
      this.notes = [];
    }
    
    this.loaded = true;
  }
  
  /**
   * Schedules a write to disk (debounced)
   */
  private scheduleSave(): void {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }
    
    this.writeTimeout = setTimeout(async () => {
      try {
        await fs.writeFile(
          NOTES_FILE,
          JSON.stringify(this.notes, null, 2),
          "utf-8"
        );
      } catch (err) {
        console.error("Failed to save notes:", err);
      }
    }, 500); // Wait 500ms before writing
  }
  
  /**
   * Adds a new note
   */
  async add(text: string, tags: string[] = []): Promise<Note> {
    await this.ensureLoaded();
    
    const note: Note = {
      id: randomUUID(),
      text,
      tags,
      created_at: new Date().toISOString(),
    };
    
    this.notes.push(note);
    this.scheduleSave();
    
    return note;
  }
  
  /**
   * Lists notes, optionally filtered by tag
   */
  async list(tag?: string, limit: number = 50): Promise<Note[]> {
    await this.ensureLoaded();
    
    let filtered = this.notes;
    
    if (tag) {
      filtered = this.notes.filter((note) => note.tags.includes(tag));
    }
    
    // Sort by created_at descending (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return filtered.slice(0, limit);
  }
  
  /**
   * Searches notes by text or tags
   */
  async search(query: string, limit: number = 20): Promise<Note[]> {
    await this.ensureLoaded();
    
    const lowerQuery = query.toLowerCase();
    
    const matches = this.notes.filter((note) => {
      // Search in text
      if (note.text.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in tags
      for (const tag of note.tags) {
        if (tag.toLowerCase().includes(lowerQuery)) {
          return true;
        }
      }
      
      return false;
    });
    
    // Sort by created_at descending (newest first)
    matches.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return matches.slice(0, limit);
  }
}

// Singleton instance
const store = new NotesStore();

/**
 * Adds a new note.
 * 
 * **When to use this tool:**
 * - Capturing quick ideas or reminders
 * - Saving code snippets or commands
 * - Recording TODOs
 * - Keeping track of decisions or insights
 * 
 * Notes are stored locally in ~/.aashna_dev_mcp/notes.json
 * 
 * @param text - The note content
 * @param tags - Optional tags for categorization
 * @returns The created note with ID and timestamp
 */
export async function addNote(
  text: string,
  tags: string[] = []
): Promise<{
  id: string;
  created_at: string;
}> {
  const note = await store.add(text, tags);
  
  return {
    id: note.id,
    created_at: note.created_at,
  };
}

/**
 * Lists notes, optionally filtered by tag.
 * 
 * **When to use this tool:**
 * - Reviewing all saved notes
 * - Finding notes by category (tag)
 * - Getting recent notes
 * 
 * @param tag - Optional tag to filter by
 * @param limit - Maximum number of notes to return (default: 50)
 * @returns Array of notes, sorted by newest first
 */
export async function listNotes(
  tag?: string,
  limit: number = 50
): Promise<{
  notes: Note[];
}> {
  const notes = await store.list(tag, limit);
  return { notes };
}

/**
 * Searches notes by text or tags.
 * 
 * **When to use this tool:**
 * - Finding a specific note
 * - Searching for keywords
 * - Retrieving relevant information
 * 
 * This performs a simple substring search across note text and tags.
 * 
 * @param query - Search query (case-insensitive)
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of matching notes, sorted by newest first
 */
export async function searchNotes(
  query: string,
  limit: number = 20
): Promise<{
  matches: Note[];
}> {
  const matches = await store.search(query, limit);
  return { matches };
}

