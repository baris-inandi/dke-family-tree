import { REQUIRED_VARIABLES, VARIABLES } from "../variables.js";

export class VariableParser {
  /**
   * Parses @SCHEMA from the file content.
   * Format: @SCHEMA name, class, eboard
   * @throws Error if @SCHEMA is missing
   */
  parseDirectives(content: string): void {
    VARIABLES.clear();
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("@SCHEMA")) {
        const value = trimmed.slice(7).trim();
        if (value) {
          VARIABLES.set("schema", value);
        }
        break;
      }
    }

    const missing = Array.from(REQUIRED_VARIABLES).filter(
      (varName) => !VARIABLES.has(varName),
    );
    if (missing.length > 0) {
      throw new Error(
        "Missing @SCHEMA. Add a line like: @SCHEMA name, class, eboard",
      );
    }

    console.log("Schema:", VARIABLES.get("schema"));
    console.log("");
  }
}
