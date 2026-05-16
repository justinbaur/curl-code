/**
 * Parse --max-time from a raw flags string and return its value in ms,
 * or null if not present. Handles both "--max-time 90" and "--max-time=90".
 */
export function parseMaxTimeMs(rawFlags: string): number | null {
    const match = rawFlags.match(/--max-time(?:=|\s+)(\d+(?:\.\d+)?)/);
    if (!match) return null;
    return Math.ceil(parseFloat(match[1]) * 1000);
}
