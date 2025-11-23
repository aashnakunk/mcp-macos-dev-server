/**
 * macOS System Monitoring & Process Management tools.
 * 
 * These tools allow AI assistants to monitor system resources, manage processes,
 * and help diagnose performance issues on macOS.
 */

import { execCommand } from "../core/exec.js";

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_mb: number;
  user: string;
}

export interface SystemStats {
  cpu_usage_percent: number;
  memory_total_gb: number;
  memory_used_gb: number;
  memory_free_gb: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_free_gb: number;
  uptime: string;
}

/**
 * Gets overall system statistics (CPU, memory, disk).
 * 
 * **When to use this tool:**
 * - "How's my Mac performing?"
 * - "Check system resources"
 * - "Is my computer running slow?"
 * - "How much disk space do I have?"
 * 
 * @returns System resource statistics
 */
export async function getSystemStats(): Promise<SystemStats> {
  // Get CPU usage
  const cpuResult = await execCommand({
    command: "top -l 1 -n 0 | grep 'CPU usage'",
    timeout_seconds: 5,
  });
  
  // Parse CPU usage (e.g., "CPU usage: 5.10% user, 3.40% sys, 91.48% idle")
  const cpuMatch = cpuResult.stdout.match(/(\d+\.\d+)% idle/);
  const cpuIdle = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
  const cpuUsage = 100 - cpuIdle;
  
  // Get memory info
  const memResult = await execCommand({
    command: "vm_stat | head -n 10",
    timeout_seconds: 5,
  });
  
  // Parse memory (pages are 4096 bytes on macOS)
  const pageSize = 4096;
  const freeMatch = memResult.stdout.match(/Pages free:\s+(\d+)/);
  const activeMatch = memResult.stdout.match(/Pages active:\s+(\d+)/);
  const inactiveMatch = memResult.stdout.match(/Pages inactive:\s+(\d+)/);
  const wiredMatch = memResult.stdout.match(/Pages wired down:\s+(\d+)/);
  
  const freePages = freeMatch ? parseInt(freeMatch[1]) : 0;
  const activePages = activeMatch ? parseInt(activeMatch[1]) : 0;
  const inactivePages = inactiveMatch ? parseInt(inactiveMatch[1]) : 0;
  const wiredPages = wiredMatch ? parseInt(wiredMatch[1]) : 0;
  
  const memoryFreeGB = (freePages * pageSize) / (1024 ** 3);
  const memoryUsedGB = ((activePages + inactivePages + wiredPages) * pageSize) / (1024 ** 3);
  const memoryTotalGB = memoryFreeGB + memoryUsedGB;
  
  // Get disk usage
  const diskResult = await execCommand({
    command: "df -H / | tail -n 1",
    timeout_seconds: 5,
  });
  
  // Parse disk usage (e.g., "/dev/disk3s1s1  500G  250G  250G  50% /")
  const diskParts = diskResult.stdout.trim().split(/\s+/);
  const diskTotal = parseFloat(diskParts[1] || "0");
  const diskUsed = parseFloat(diskParts[2] || "0");
  const diskFree = parseFloat(diskParts[3] || "0");
  
  // Get uptime
  const uptimeResult = await execCommand({
    command: "uptime",
    timeout_seconds: 5,
  });
  
  return {
    cpu_usage_percent: Math.round(cpuUsage * 10) / 10,
    memory_total_gb: Math.round(memoryTotalGB * 10) / 10,
    memory_used_gb: Math.round(memoryUsedGB * 10) / 10,
    memory_free_gb: Math.round(memoryFreeGB * 10) / 10,
    disk_total_gb: diskTotal,
    disk_used_gb: diskUsed,
    disk_free_gb: diskFree,
    uptime: uptimeResult.stdout.trim(),
  };
}

/**
 * Lists running processes, sorted by resource usage.
 * 
 * **When to use this tool:**
 * - "What's using all my CPU?"
 * - "Show me memory-hungry processes"
 * - "What processes are running?"
 * - "Find processes using a lot of resources"
 * 
 * @param sort_by - Sort by "cpu" or "memory" (default: "cpu")
 * @param limit - Number of processes to return (default: 20)
 * @returns List of top processes
 */
export async function listProcesses(
  sort_by: "cpu" | "memory" = "cpu",
  limit: number = 20
): Promise<{
  processes: ProcessInfo[];
}> {
  // Sort by CPU (column 3) or memory (column 4)
  const sortColumn = sort_by === "memory" ? "4" : "3";
  
  const result = await execCommand({
    command: `ps aux | sort -k${sortColumn} -r | head -n ${limit + 1}`,
    timeout_seconds: 5,
  });
  
  const processes: ProcessInfo[] = [];
  const lines = result.stdout.trim().split("\n");
  
  // Skip header line
  for (let i = 1; i < lines.length && i <= limit; i++) {
    const line = lines[i];
    const parts = line.trim().split(/\s+/);
    
    if (parts.length >= 11) {
      const user = parts[0];
      const pid = parseInt(parts[1]);
      const cpu = parseFloat(parts[2]);
      const mem = parseFloat(parts[3]);
      
      // Process name is the rest after the first 10 fields
      const name = parts.slice(10).join(" ");
      
      // Calculate memory in MB (percentage of total memory)
      const memResult = await execCommand({
        command: "sysctl hw.memsize",
        timeout_seconds: 2,
      });
      const memMatch = memResult.stdout.match(/(\d+)/);
      const totalMem = memMatch ? parseInt(memMatch[1]) : 0;
      const memMB = (mem / 100) * (totalMem / (1024 * 1024));
      
      processes.push({
        pid,
        name,
        cpu_percent: Math.round(cpu * 10) / 10,
        memory_mb: Math.round(memMB),
        user,
      });
    }
  }
  
  return { processes };
}

/**
 * Finds processes by name or pattern.
 * 
 * **When to use this tool:**
 * - "Find node processes"
 * - "Is Docker running?"
 * - "Show me all Python processes"
 * 
 * @param pattern - Process name or pattern to search for
 * @returns Matching processes
 */
export async function findProcesses(pattern: string): Promise<{
  processes: ProcessInfo[];
}> {
  const result = await execCommand({
    command: `ps aux | grep -i "${pattern}" | grep -v grep`,
    timeout_seconds: 5,
  });
  
  const processes: ProcessInfo[] = [];
  const lines = result.stdout.trim().split("\n");
  
  for (const line of lines) {
    if (!line) continue;
    
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 11) {
      processes.push({
        pid: parseInt(parts[1]),
        name: parts.slice(10).join(" "),
        cpu_percent: parseFloat(parts[2]),
        memory_mb: 0, // Simplified for search
        user: parts[0],
      });
    }
  }
  
  return { processes };
}

/**
 * Kills a process by PID.
 * 
 * **When to use this tool:**
 * - "Kill process 1234"
 * - "Stop the node process on PID 5678"
 * - "Force quit process 9999"
 * 
 * **Note:** This is a destructive operation. Be careful!
 * 
 * @param pid - Process ID to kill
 * @param force - Use SIGKILL (-9) instead of SIGTERM (default: false)
 * @returns Kill result
 */
export async function killProcess(
  pid: number,
  force: boolean = false
): Promise<{
  success: boolean;
  message: string;
}> {
  const signal = force ? "-9" : "-15";
  
  const result = await execCommand({
    command: `kill ${signal} ${pid}`,
    timeout_seconds: 5,
  });
  
  if (result.exit_code === 0) {
    return {
      success: true,
      message: `Process ${pid} killed successfully`,
    };
  } else {
    return {
      success: false,
      message: `Failed to kill process ${pid}: ${result.stderr}`,
    };
  }
}

/**
 * Gets disk usage for a specific directory (what's taking up space).
 * 
 * **When to use this tool:**
 * - "What's taking up space in my home folder?"
 * - "Show me largest directories"
 * - "Analyze disk usage in ~/Downloads"
 * 
 * @param path - Directory path to analyze (default: home directory)
 * @param depth - How deep to scan (default: 1 level)
 * @returns Directory sizes sorted by largest first
 */
export async function analyzeDiskUsage(
  path: string = "~",
  depth: number = 1
): Promise<{
  path: string;
  entries: Array<{
    name: string;
    size_gb: number;
    size_human: string;
  }>;
}> {
  const result = await execCommand({
    command: `du -d ${depth} -h "${path}" 2>/dev/null | sort -hr | head -n 20`,
    timeout_seconds: 30,
    max_output_chars: 50000,
  });
  
  const entries: Array<{ name: string; size_gb: number; size_human: string }> = [];
  const lines = result.stdout.trim().split("\n");
  
  for (const line of lines) {
    const parts = line.trim().split(/\t/);
    if (parts.length >= 2) {
      const sizeStr = parts[0];
      const dirPath = parts[1];
      
      // Parse size (e.g., "5.0G", "250M", "10K")
      let sizeGB = 0;
      if (sizeStr.includes("G")) {
        sizeGB = parseFloat(sizeStr);
      } else if (sizeStr.includes("M")) {
        sizeGB = parseFloat(sizeStr) / 1024;
      } else if (sizeStr.includes("K")) {
        sizeGB = parseFloat(sizeStr) / (1024 * 1024);
      }
      
      entries.push({
        name: dirPath,
        size_gb: Math.round(sizeGB * 100) / 100,
        size_human: sizeStr,
      });
    }
  }
  
  return {
    path,
    entries,
  };
}

