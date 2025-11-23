/**
 * Apple Reminders integration for macOS.
 * 
 * These tools allow AI assistants to interact with your Apple Reminders app,
 * enabling natural language task management integrated with your existing reminders.
 */

import { execCommand } from "../core/exec.js";

export interface Reminder {
  name: string;
  completed: boolean;
  due_date?: string;
  list: string;
  priority?: number;
  notes?: string;
}

/**
 * Lists reminders from Apple Reminders.
 * 
 * **When to use this tool:**
 * - "What's on my to-do list?"
 * - "Show me incomplete reminders"
 * - "What reminders are due today?"
 * 
 * @param list - Optional list name to filter by (e.g., "Work", "Personal")
 * @param completed - Show completed reminders (default: false, only incomplete)
 * @param limit - Maximum reminders to return (default: 50)
 * @returns Array of reminders
 */
export async function listReminders(
  list?: string,
  completed: boolean = false,
  limit: number = 50
): Promise<{
  reminders: Reminder[];
}> {
  const listFilter = list ? `of list "${list}"` : "";
  const completedFilter = completed ? "" : "whose completed is false";
  
  const script = `
    tell application "Reminders"
      set remindersList to {}
      set allReminders to reminders ${listFilter} ${completedFilter}
      repeat with aReminder in allReminders
        set reminderName to name of aReminder
        set isCompleted to completed of aReminder
        set reminderList to name of container of aReminder
        set end of remindersList to (reminderName & "|" & isCompleted & "|" & reminderList)
      end repeat
      return remindersList as text
    end tell
  `;
  
  const result = await execCommand({
    command: `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    timeout_seconds: 15,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to list reminders: ${result.stderr}`);
  }
  
  const reminders: Reminder[] = [];
  const output = result.stdout.trim();
  
  if (output) {
    const items = output.split(", ");
    for (const item of items.slice(0, limit)) {
      const [name, completed, listName] = item.split("|");
      if (name) {
        reminders.push({
          name: name.trim(),
          completed: completed === "true",
          list: listName || "Reminders",
        });
      }
    }
  }
  
  return { reminders };
}

/**
 * Creates a new reminder in Apple Reminders.
 * 
 * **When to use this tool:**
 * - "Remind me to call John tomorrow"
 * - "Add a reminder to buy groceries"
 * - "Create a task to review the report"
 * 
 * @param title - Reminder title/task
 * @param list - List name (default: "Reminders")
 * @param due_date - Optional due date (e.g., "tomorrow", "next monday", "2024-12-25")
 * @param notes - Optional notes/description
 * @returns Created reminder info
 */
export async function createReminder(
  title: string,
  list: string = "Reminders",
  due_date?: string,
  notes?: string
): Promise<{
  success: boolean;
  reminder_name: string;
  list: string;
}> {
  const escapedTitle = title.replace(/'/g, "'\\''");
  const escapedList = list.replace(/'/g, "'\\''");
  const escapedNotes = notes ? notes.replace(/'/g, "'\\''") : "";
  
  let dueDateScript = "";
  if (due_date) {
    // Parse common date formats
    dueDateScript = `, due date:date "${due_date}"`;
  }
  
  let notesScript = "";
  if (notes) {
    notesScript = `, body:"${escapedNotes}"`;
  }
  
  const script = `
    tell application "Reminders"
      tell list "${escapedList}"
        make new reminder with properties {name:"${escapedTitle}"${dueDateScript}${notesScript}}
      end tell
    end tell
  `;
  
  const result = await execCommand({
    command: `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    timeout_seconds: 10,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to create reminder: ${result.stderr}`);
  }
  
  return {
    success: true,
    reminder_name: title,
    list,
  };
}

/**
 * Marks a reminder as complete.
 * 
 * **When to use this tool:**
 * - "Mark 'buy milk' as done"
 * - "Complete the task about the meeting"
 * 
 * @param reminderName - Name of the reminder to complete
 * @param list - Optional list name to search in
 * @returns Completion result
 */
export async function completeReminder(
  reminderName: string,
  list?: string
): Promise<{
  success: boolean;
  reminder_name: string;
}> {
  const escapedName = reminderName.replace(/'/g, "'\\''");
  const listFilter = list ? `of list "${list}"` : "";
  
  const script = `
    tell application "Reminders"
      set foundReminders to reminders ${listFilter} whose name is "${escapedName}"
      if (count of foundReminders) > 0 then
        set completed of item 1 of foundReminders to true
        return "success"
      else
        return "not found"
      end if
    end tell
  `;
  
  const result = await execCommand({
    command: `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    timeout_seconds: 10,
  });
  
  if (result.exit_code !== 0) {
    throw new Error(`Failed to complete reminder: ${result.stderr}`);
  }
  
  const success = result.stdout.trim() === "success";
  
  if (!success) {
    throw new Error(`Reminder "${reminderName}" not found`);
  }
  
  return {
    success: true,
    reminder_name: reminderName,
  };
}

