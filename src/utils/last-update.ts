// Server-only utility (Astro build/SSR)
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

// Simple per-build cache to avoid repeated lookups
const cache = new Map<string, Date>();

/**
 * Returns the last modified Date for a given file path.
 * Uses local git log to find the last commit date for the file.
 * Falls back to current date if git is unavailable.
 */
export async function getLastModifiedDate(file_path: string): Promise<Date> {
  try {
    const localPath = file_path.replace(/\\/g, "/");

    const cached = cache.get(localPath);
    if (cached) return cached;

    const { stdout } = await execFileP("git", [
      "log",
      "-1",
      "--format=%cI",
      "--",
      localPath,
    ]);
    const iso = stdout.trim();
    if (iso) {
      const date = new Date(iso);
      cache.set(localPath, date);
      return date;
    }

    throw new Error("No commit data found");
  } catch (error) {
    console.error("Error fetching last modified date:", error);
    return new Date();
  }
}
