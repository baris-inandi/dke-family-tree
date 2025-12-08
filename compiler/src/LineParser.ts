import { toTitleCase } from "../constants.js";
import type { ParsedLine } from "../types.js";
import { VARIABLES } from "../variables.js";

export class LineParser {
  /**
   * Gets the schema fields from VARIABLES.
   */
  private getSchemaFields(): string[] {
    const schema = VARIABLES.get("schema");
    if (!schema) {
      throw new Error("Schema not defined. Ensure @def schema is set.");
    }
    return schema.split(",").map((field) => field.trim());
  }

  /**
   * Parses a single line from the input file.
   * Returns null for empty lines or comments.
   * @throws Error if line format is invalid
   */
  parseLine(line: string): ParsedLine | null {
    // Skip empty lines and comments
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@")) {
      return null;
    }

    // Count leading spaces (4 spaces = 1 indent level)
    const indent = (line.match(/^ */)?.[0]?.length ?? 0) / 4;

    // Get schema fields
    const schemaFields = this.getSchemaFields();

    // Special case: if line is just "REDACTED" (no commas), set all fields to "[REDACTED]"
    if (trimmed === "REDACTED" || trimmed.toUpperCase() === "REDACTED") {
      const parsed: ParsedLine = { indent };
      for (const field of schemaFields) {
        parsed[field] = "[REDACTED]";
      }
      return parsed;
    }

    // Parse CSV format based on schema
    const parts = trimmed.split(",").map((part) => part.trim());

    // Require at least the first two fields (name and class) to be present
    if (parts.length < 2) {
      throw new Error(
        `Invalid line format: expected at least 2 fields (name, class), got ${parts.length}: ${line}`,
      );
    }

    // Build parsed line object with schema fields
    // Missing optional fields will be set to empty string
    // Class field is normalized to uppercase
    const parsed: ParsedLine = { indent };
    for (let i = 0; i < schemaFields.length; i++) {
      const fieldName = schemaFields[i];
      let value = parts[i] || "";

      // Normalize class field to Title Case (capitalize each word)
      if (fieldName === "class" && value && value !== "[REDACTED]") {
        value = toTitleCase(value);
      }

      parsed[fieldName] = value;
    }

    return parsed;
  }

  /**
   * Parses all lines from the input content.
   */
  parseLines(content: string): ParsedLine[] {
    const lines = content.split("\n");
    const parsedLines: ParsedLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      const parsed = this.parseLine(lines[i]);
      if (parsed) {
        parsedLines.push(parsed);
      }
    }

    return parsedLines;
  }
}
