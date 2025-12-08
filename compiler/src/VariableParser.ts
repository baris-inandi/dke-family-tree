import { REQUIRED_VARIABLES, VARIABLES } from "../variables.js";

export class VariableParser {
  /**
   * Parses @def directives from the file content and populates the global variables map.
   * Format: @def <varname> <value>
   * Example: @def output tree.json
   * @throws Error if required variables are missing
   */
  parseDirectives(content: string): void {
    VARIABLES.clear();
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("@def")) {
        this.parseDefDirective(trimmed, i + 1);
      }
    }

    // Validate required variables
    const missing = Array.from(REQUIRED_VARIABLES).filter(
      (varName) => !VARIABLES.has(varName),
    );

    if (missing.length > 0) {
      throw new Error(
        `Missing required @def directives: ${missing.join(", ")}`,
      );
    }

    // Log parsed directives
    if (VARIABLES.size > 0) {
      console.log(`Parsed ${VARIABLES.size} directive(s):`);
      VARIABLES.forEach((value, key) => {
        console.log(`  ${key} = ${value}`);
      });
      console.log("");
    }
  }

  /**
   * Parses a single @def directive.
   * Format: @def <varname> <value>
   */
  private parseDefDirective(line: string, lineNumber: number): void {
    // Remove @def prefix
    const rest = line.substring(4).trim();

    if (!rest) {
      console.warn(
        `Warning: Line ${lineNumber}: @def directive has no content`,
      );
      return;
    }

    // Split on first whitespace to get varname and value
    const match = rest.match(/^(\S+)\s+(.+)$/);
    if (!match) {
      // If no whitespace after varname, treat entire rest as varname with empty value
      VARIABLES.set(rest, "");
      return;
    }

    const varname = match[1];
    const value = match[2];

    VARIABLES.set(varname, value);
  }
}
