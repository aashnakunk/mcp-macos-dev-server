/**
 * macOS Calendar integration.
 * 
 * These tools allow AI assistants to interact with your Apple Calendar app,
 * enabling natural language calendar management and scheduling assistance.
 */

import { execCommand } from "../core/exec.js";

export interface CalendarEvent {
  summary: string;
  start_date: string;
  end_date: string;
  location?: string;
  calendar: string;
}

/**
 * Lists upcoming calendar events.
 * 
 * **When to use this tool:**
 * - "What's on my calendar today?"
 * - "Show me this week's meetings"
 * - "What meetings do I have?"
 * 
 * @param days_ahead - Number of days to look ahead (default: 7)
 * @param limit - Maximum events to return (default: 20)
 * @returns Upcoming calendar events
 */
export async function listCalendarEvents(
  days_ahead: number = 7,
  limit: number = 20
): Promise<{
  events: CalendarEvent[];
}> {
  const script = `
    tell application "Calendar"
      set startDate to current date
      set endDate to startDate + (${days_ahead} * days)
      set eventsList to {}
      
      repeat with aCalendar in calendars
        set calEvents to (every event of aCalendar whose start date ≥ startDate and start date ≤ endDate)
        repeat with anEvent in calEvents
          set eventInfo to {¬
            summary:(summary of anEvent), ¬
            startDate:(start date of anEvent as string), ¬
            endDate:(end date of anEvent as string), ¬
            location:(location of anEvent), ¬
            calendar:(name of aCalendar)}
          set end of eventsList to (summary of anEvent & "|" & (start date of anEvent as string) & "|" & (end date of anEvent as string) & "|" & (location of anEvent) & "|" & (name of aCalendar))
        end repeat
      end repeat
      
      return eventsList as text
    end tell
  `;
  
  const result = await execCommand({
    command: `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    timeout_seconds: 15,
    max_output_chars: 50000,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to list calendar events: ${result.stderr}`);
  }
  
  const events: CalendarEvent[] = [];
  const output = result.stdout.trim();
  
  if (output) {
    const items = output.split(", ");
    for (const item of items.slice(0, limit)) {
      const [summary, startDate, endDate, location, calendar] = item.split("|");
      if (summary) {
        events.push({
          summary: summary.trim(),
          start_date: startDate?.trim() || "",
          end_date: endDate?.trim() || "",
          location: location?.trim() || undefined,
          calendar: calendar?.trim() || "Calendar",
        });
      }
    }
  }
  
  return { events };
}

/**
 * Creates a new calendar event.
 * 
 * **When to use this tool:**
 * - "Add a meeting tomorrow at 2pm"
 * - "Create an event for Friday"
 * - "Schedule a call with John"
 * 
 * @param summary - Event title/summary
 * @param start_date - Start date/time (e.g., "tomorrow at 2pm", "12/25/2024 10:00 AM")
 * @param duration_minutes - Event duration in minutes (default: 60)
 * @param location - Optional location
 * @param calendar - Calendar name (default: uses default calendar)
 * @returns Created event info
 */
export async function createCalendarEvent(
  summary: string,
  start_date: string,
  duration_minutes: number = 60,
  location?: string,
  calendar?: string
): Promise<{
  success: boolean;
  event_summary: string;
  start_date: string;
}> {
  const escapedSummary = summary.replace(/'/g, "'\\''");
  const escapedLocation = location ? location.replace(/'/g, "'\\''") : "";
  
  const locationScript = location ? `, location:"${escapedLocation}"` : "";
  
  const script = `
    tell application "Calendar"
      set startDate to date "${start_date}"
      set endDate to startDate + (${duration_minutes} * minutes)
      
      ${calendar ? `tell calendar "${calendar}"` : ""}
        make new event with properties {summary:"${escapedSummary}", start date:startDate, end date:endDate${locationScript}}
      ${calendar ? "end tell" : ""}
    end tell
  `;
  
  const result = await execCommand({
    command: `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    timeout_seconds: 10,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to create calendar event: ${result.stderr}`);
  }
  
  return {
    success: true,
    event_summary: summary,
    start_date,
  };
}

/**
 * Checks calendar availability (if there are conflicts in a time range).
 * 
 * **When to use this tool:**
 * - "Am I free tomorrow at 3pm?"
 * - "Check availability on Friday"
 * - "Do I have any conflicts this afternoon?"
 * 
 * @param start_date - Start date/time to check
 * @param end_date - End date/time to check
 * @returns Availability and any conflicting events
 */
export async function checkAvailability(
  start_date: string,
  end_date: string
): Promise<{
  available: boolean;
  conflicts: CalendarEvent[];
}> {
  const script = `
    tell application "Calendar"
      set startDate to date "${start_date}"
      set endDate to date "${end_date}"
      set conflictsList to {}
      
      repeat with aCalendar in calendars
        set calEvents to (every event of aCalendar whose start date ≤ endDate and end date ≥ startDate)
        repeat with anEvent in calEvents
          set end of conflictsList to (summary of anEvent & "|" & (start date of anEvent as string) & "|" & (end date of anEvent as string))
        end repeat
      end repeat
      
      return conflictsList as text
    end tell
  `;
  
  const result = await execCommand({
    command: `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    timeout_seconds: 10,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to check availability: ${result.stderr}`);
  }
  
  const conflicts: CalendarEvent[] = [];
  const output = result.stdout.trim();
  
  if (output) {
    const items = output.split(", ");
    for (const item of items) {
      const [summary, startDate, endDate] = item.split("|");
      if (summary) {
        conflicts.push({
          summary: summary.trim(),
          start_date: startDate?.trim() || "",
          end_date: endDate?.trim() || "",
          calendar: "Calendar",
        });
      }
    }
  }
  
  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

/**
 * Lists all calendars.
 * 
 * **When to use this tool:**
 * - "What calendars do I have?"
 * - "Show my calendar list"
 * 
 * @returns List of calendar names
 */
export async function listCalendars(): Promise<{
  calendars: string[];
}> {
  const script = `
    tell application "Calendar"
      set calendarNames to {}
      repeat with aCalendar in calendars
        set end of calendarNames to name of aCalendar
      end repeat
      return calendarNames as text
    end tell
  `;
  
  const result = await execCommand({
    command: `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    timeout_seconds: 5,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to list calendars: ${result.stderr}`);
  }
  
  const calendars = result.stdout.trim().split(", ").filter(Boolean);
  
  return { calendars };
}

