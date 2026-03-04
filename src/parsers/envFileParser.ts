/**
 * Parser for standard .env files
 *
 * Supported formats:
 *   KEY=VALUE
 *   KEY="quoted value"
 *   KEY='single quoted value'
 *   export KEY=VALUE
 *   # comments
 *   blank lines (ignored)
 */

export interface EnvFileVariable {
    key: string;
    value: string;
}

/**
 * Parse .env file content into key-value pairs
 */
export function parseEnvFileContent(content: string): EnvFileVariable[] {
    const variables: EnvFileVariable[] = [];
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
        const line = rawLine.trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('#')) {
            continue;
        }

        // Strip optional 'export ' prefix
        const stripped = line.startsWith('export ')
            ? line.slice(7).trim()
            : line;

        // Find the first '=' to split key and value
        const eqIndex = stripped.indexOf('=');
        if (eqIndex === -1) {
            continue;
        }

        const key = stripped.slice(0, eqIndex).trim();
        if (!key) {
            continue;
        }

        let value = stripped.slice(eqIndex + 1).trim();

        // Remove surrounding quotes if present
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        variables.push({ key, value });
    }

    return variables;
}
