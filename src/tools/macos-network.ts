/**
 * macOS Network tools.
 * 
 * These tools allow AI assistants to diagnose network issues, check connectivity,
 * and manage network-related tasks.
 */

import { execCommand } from "../core/exec.js";

export interface NetworkConnection {
  protocol: string;
  local_address: string;
  foreign_address: string;
  state: string;
  pid?: number;
  process?: string;
}

export interface PortInfo {
  port: number;
  pid: number;
  process: string;
  protocol: string;
}

/**
 * Lists active network connections.
 * 
 * **When to use this tool:**
 * - "Show me active network connections"
 * - "What's connected to my Mac?"
 * - "List established connections"
 * 
 * @param state - Filter by state (e.g., "ESTABLISHED", "LISTEN")
 * @returns Active network connections
 */
export async function listConnections(state?: string): Promise<{
  connections: NetworkConnection[];
}> {
  const result = await execCommand({
    command: "netstat -anv | grep tcp",
    timeout_seconds: 10,
  });
  
  const connections: NetworkConnection[] = [];
  const lines = result.stdout.trim().split("\n");
  
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 6) {
      const connState = parts[5];
      
      // Filter by state if specified
      if (state && !connState.includes(state)) {
        continue;
      }
      
      connections.push({
        protocol: parts[0],
        local_address: parts[3],
        foreign_address: parts[4],
        state: connState,
      });
    }
  }
  
  return { connections };
}

/**
 * Checks what process is using a specific port.
 * 
 * **When to use this tool:**
 * - "What's running on port 3000?"
 * - "Is port 8080 in use?"
 * - "Find what's using port 5432"
 * 
 * @param port - Port number to check
 * @returns Process info using the port
 */
export async function checkPort(port: number): Promise<{
  in_use: boolean;
  port: number;
  pid?: number;
  process?: string;
  protocol?: string;
}> {
  const result = await execCommand({
    command: `lsof -i :${port} -P -n`,
    timeout_seconds: 5,
  });
  
  if (result.exit_code !== 0 || !result.stdout.trim()) {
    return {
      in_use: false,
      port,
    };
  }
  
  // Parse lsof output
  const lines = result.stdout.trim().split("\n");
  if (lines.length > 1) {
    const parts = lines[1].trim().split(/\s+/);
    return {
      in_use: true,
      port,
      process: parts[0],
      pid: parseInt(parts[1]),
      protocol: parts[7],
    };
  }
  
  return {
    in_use: false,
    port,
  };
}

/**
 * Lists all ports currently in use.
 * 
 * **When to use this tool:**
 * - "Show me all open ports"
 * - "What ports are listening?"
 * - "List all server ports"
 * 
 * @param listening_only - Only show listening ports (default: true)
 * @returns List of ports in use
 */
export async function listPorts(listening_only: boolean = true): Promise<{
  ports: PortInfo[];
}> {
  const listenFlag = listening_only ? "-P -iTCP -sTCP:LISTEN" : "-P -iTCP";
  
  const result = await execCommand({
    command: `lsof ${listenFlag} -n`,
    timeout_seconds: 10,
  });
  
  const ports: PortInfo[] = [];
  const lines = result.stdout.trim().split("\n");
  const seen = new Set<string>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.trim().split(/\s+/);
    
    if (parts.length >= 9) {
      const process = parts[0];
      const pid = parseInt(parts[1]);
      const protocol = parts[7];
      const address = parts[8];
      
      // Extract port from address (e.g., "*:8080" or "127.0.0.1:3000")
      const portMatch = address.match(/:(\d+)/);
      if (portMatch) {
        const port = parseInt(portMatch[1]);
        const key = `${port}-${pid}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          ports.push({
            port,
            pid,
            process,
            protocol,
          });
        }
      }
    }
  }
  
  // Sort by port number
  ports.sort((a, b) => a.port - b.port);
  
  return { ports };
}

/**
 * Pings a host to check connectivity.
 * 
 * **When to use this tool:**
 * - "Ping google.com"
 * - "Check if server is reachable"
 * - "Test network connectivity"
 * 
 * @param host - Hostname or IP address
 * @param count - Number of pings (default: 4)
 * @returns Ping results
 */
export async function pingHost(host: string, count: number = 4): Promise<{
  host: string;
  reachable: boolean;
  packets_sent: number;
  packets_received: number;
  packet_loss_percent: number;
  avg_rtt_ms?: number;
  output: string;
}> {
  const result = await execCommand({
    command: `ping -c ${count} ${host}`,
    timeout_seconds: count + 5,
  });
  
  const output = result.stdout + result.stderr;
  
  // Parse ping results
  const lossMatch = output.match(/(\d+)% packet loss/);
  const rttMatch = output.match(/min\/avg\/max[^=]*=\s*[\d.]+\/([\d.]+)\/([\d.]+)/);
  
  const packetLoss = lossMatch ? parseInt(lossMatch[1]) : 100;
  const avgRTT = rttMatch ? parseFloat(rttMatch[1]) : undefined;
  
  return {
    host,
    reachable: result.exit_code === 0,
    packets_sent: count,
    packets_received: count - Math.round((count * packetLoss) / 100),
    packet_loss_percent: packetLoss,
    avg_rtt_ms: avgRTT,
    output: output.trim(),
  };
}

/**
 * Performs DNS lookup for a hostname.
 * 
 * **When to use this tool:**
 * - "Look up DNS for example.com"
 * - "What's the IP address of github.com?"
 * - "Resolve hostname"
 * 
 * @param hostname - Hostname to look up
 * @returns DNS lookup results
 */
export async function dnsLookup(hostname: string): Promise<{
  hostname: string;
  ip_addresses: string[];
  output: string;
}> {
  const result = await execCommand({
    command: `nslookup ${hostname}`,
    timeout_seconds: 10,
  });
  
  const ipAddresses: string[] = [];
  const lines = result.stdout.split("\n");
  
  for (const line of lines) {
    // Match "Address: 1.2.3.4" format
    const match = line.match(/Address:\s*(\d+\.\d+\.\d+\.\d+)/);
    if (match) {
      ipAddresses.push(match[1]);
    }
  }
  
  return {
    hostname,
    ip_addresses: ipAddresses,
    output: result.stdout.trim(),
  };
}

/**
 * Gets current network interface information.
 * 
 * **When to use this tool:**
 * - "What's my IP address?"
 * - "Show network interfaces"
 * - "Check WiFi connection"
 * 
 * @returns Network interface information
 */
export async function getNetworkInfo(): Promise<{
  interfaces: Array<{
    name: string;
    ip_address?: string;
    status: string;
  }>;
}> {
  const result = await execCommand({
    command: "ifconfig",
    timeout_seconds: 5,
  });
  
  const interfaces: Array<{ name: string; ip_address?: string; status: string }> = [];
  const sections = result.stdout.split(/\n(?=\w)/);
  
  for (const section of sections) {
    const lines = section.split("\n");
    const firstLine = lines[0];
    
    if (!firstLine) continue;
    
    const nameMatch = firstLine.match(/^(\w+):/);
    if (nameMatch) {
      const name = nameMatch[1];
      const statusMatch = section.match(/status:\s*(\w+)/);
      const ipMatch = section.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
      
      interfaces.push({
        name,
        ip_address: ipMatch ? ipMatch[1] : undefined,
        status: statusMatch ? statusMatch[1] : "unknown",
      });
    }
  }
  
  return { interfaces };
}

/**
 * Tests HTTP/HTTPS connectivity to a URL.
 * 
 * **When to use this tool:**
 * - "Check if website is up"
 * - "Test API endpoint"
 * - "Is this URL accessible?"
 * 
 * @param url - URL to test
 * @returns HTTP response status
 */
export async function testUrl(url: string): Promise<{
  url: string;
  accessible: boolean;
  status_code?: number;
  response_time_ms?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  const result = await execCommand({
    command: `curl -o /dev/null -s -w "%{http_code}" -m 10 "${url}"`,
    timeout_seconds: 15,
  });
  
  const responseTime = Date.now() - startTime;
  
  if (result.exit_code === 0) {
    const statusCode = parseInt(result.stdout.trim());
    return {
      url,
      accessible: statusCode < 400,
      status_code: statusCode,
      response_time_ms: responseTime,
    };
  } else {
    return {
      url,
      accessible: false,
      error: result.stderr || "Request failed",
    };
  }
}

