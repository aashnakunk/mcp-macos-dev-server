/**
 * Project helper tools for discovering and analyzing code repositories.
 * 
 * These tools help AI assistants understand your development environment,
 * find repositories, detect technology stacks, and run common project tasks.
 */

import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { resolveSafePath, findDirectoriesWithMarker } from "../core/paths.js";
import { execCommand } from "../core/exec.js";
import type { RepoInfo, TechStack } from "../core/types.js";

/**
 * Lists all git repositories under a root directory.
 * 
 * **When to use this tool:**
 * - Getting an overview of all projects
 * - Finding a specific repository
 * - Discovering codebases in a directory tree
 * 
 * @param rootPath - Root directory to search
 * @param maxDepth - Maximum directory depth to search (default: 3)
 * @returns Array of repository information
 */
export async function listRepositories(
  rootPath: string,
  maxDepth: number = 3
): Promise<{
  repos: RepoInfo[];
}> {
  const safePath = resolveSafePath(rootPath);
  
  const repoPaths = findDirectoriesWithMarker(safePath, ".git", maxDepth);
  
  const repos: RepoInfo[] = repoPaths.map((repoPath) => ({
    path: repoPath,
    name: path.basename(repoPath),
  }));
  
  return { repos };
}

/**
 * Detects the technology stack of a repository.
 * 
 * **When to use this tool:**
 * - Understanding a new codebase
 * - Finding the right commands to run (test, dev, build)
 * - Determining what language/framework is used
 * 
 * This tool uses heuristics based on common files (package.json, requirements.txt, etc.)
 * to infer the technology stack and provide helpful commands.
 * 
 * @param repoPath - Path to the repository
 * @returns Detected technology stack information
 */
export async function detectTechStack(repoPath: string): Promise<TechStack> {
  const safePath = resolveSafePath(repoPath);
  
  const stack: TechStack = {
    frameworks: [],
  };
  
  const notes: string[] = [];
  
  // Check for Node.js / JavaScript / TypeScript
  const packageJsonPath = path.join(safePath, "package.json");
  if (fsSync.existsSync(packageJsonPath)) {
    stack.language = "JavaScript/TypeScript";
    
    try {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, "utf-8")
      );
      
      // Check for frameworks in dependencies
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      
      if (allDeps.react) stack.frameworks.push("React");
      if (allDeps.vue) stack.frameworks.push("Vue");
      if (allDeps.angular) stack.frameworks.push("Angular");
      if (allDeps.next) stack.frameworks.push("Next.js");
      if (allDeps.express) stack.frameworks.push("Express");
      if (allDeps.fastify) stack.frameworks.push("Fastify");
      if (allDeps.svelte) stack.frameworks.push("Svelte");
      
      // Extract commands from scripts
      if (packageJson.scripts) {
        if (packageJson.scripts.test) {
          stack.test_command = "npm test";
        }
        if (packageJson.scripts.dev) {
          stack.dev_command = "npm run dev";
        } else if (packageJson.scripts.start) {
          stack.dev_command = "npm start";
        }
      }
    } catch {
      notes.push("Found package.json but couldn't parse it");
    }
  }
  
  // Check for Python
  const requirementsTxtPath = path.join(safePath, "requirements.txt");
  const pyprojectTomlPath = path.join(safePath, "pyproject.toml");
  const managePyPath = path.join(safePath, "manage.py");
  
  if (
    fsSync.existsSync(requirementsTxtPath) ||
    fsSync.existsSync(pyprojectTomlPath)
  ) {
    stack.language = "Python";
    
    if (fsSync.existsSync(managePyPath)) {
      stack.frameworks.push("Django");
      stack.dev_command = "python manage.py runserver";
      stack.test_command = "python manage.py test";
    } else {
      // Check for common Python frameworks
      try {
        let requirements = "";
        if (fsSync.existsSync(requirementsTxtPath)) {
          requirements = await fs.readFile(requirementsTxtPath, "utf-8");
        }
        
        if (requirements.includes("flask")) stack.frameworks.push("Flask");
        if (requirements.includes("fastapi")) stack.frameworks.push("FastAPI");
        if (requirements.includes("django")) stack.frameworks.push("Django");
        if (requirements.includes("pytest")) {
          stack.test_command = "pytest";
        } else {
          stack.test_command = "python -m unittest";
        }
      } catch {
        notes.push("Found Python files but couldn't read requirements");
      }
    }
  }
  
  // Check for Rust
  const cargoTomlPath = path.join(safePath, "Cargo.toml");
  if (fsSync.existsSync(cargoTomlPath)) {
    stack.language = "Rust";
    stack.test_command = "cargo test";
    stack.dev_command = "cargo run";
  }
  
  // Check for Go
  const goModPath = path.join(safePath, "go.mod");
  if (fsSync.existsSync(goModPath)) {
    stack.language = "Go";
    stack.test_command = "go test ./...";
    stack.dev_command = "go run .";
  }
  
  // Check for Java/Kotlin
  const pomXmlPath = path.join(safePath, "pom.xml");
  const buildGradlePath = path.join(safePath, "build.gradle");
  if (fsSync.existsSync(pomXmlPath)) {
    stack.language = "Java";
    stack.frameworks.push("Maven");
    stack.test_command = "mvn test";
  } else if (fsSync.existsSync(buildGradlePath)) {
    stack.language = "Java/Kotlin";
    stack.frameworks.push("Gradle");
    stack.test_command = "gradle test";
  }
  
  // Check for Ruby
  const gemfilePath = path.join(safePath, "Gemfile");
  if (fsSync.existsSync(gemfilePath)) {
    stack.language = "Ruby";
    try {
      const gemfile = await fs.readFile(gemfilePath, "utf-8");
      if (gemfile.includes("rails")) {
        stack.frameworks.push("Ruby on Rails");
        stack.dev_command = "rails server";
        stack.test_command = "rails test";
      }
    } catch {
      notes.push("Found Gemfile but couldn't read it");
    }
  }
  
  if (notes.length > 0) {
    stack.notes = notes.join("; ");
  }
  
  return stack;
}

/**
 * Runs tests for a project.
 * 
 * **When to use this tool:**
 * - Verifying code changes
 * - Checking if tests pass
 * - Running specific test suites
 * - Validating a build
 * 
 * If test_command is not provided, this tool will attempt to detect it
 * automatically using detectTechStack.
 * 
 * @param repoPath - Path to the repository
 * @param testCommand - Command to run tests (optional, will auto-detect)
 * @returns Test execution result
 */
export async function runTests(
  repoPath: string,
  testCommand?: string
): Promise<{
  stdout: string;
  stderr: string;
  exit_code: number;
}> {
  const safePath = resolveSafePath(repoPath);
  
  // Auto-detect test command if not provided
  let command = testCommand;
  if (!command) {
    const stack = await detectTechStack(safePath);
    command = stack.test_command;
    
    if (!command) {
      throw new Error(
        "Could not detect test command. Please provide test_command parameter."
      );
    }
  }
  
  const result = await execCommand({
    command,
    cwd: safePath,
    timeout_seconds: 300, // Tests can take a while
  });
  
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exit_code: result.exit_code,
  };
}

