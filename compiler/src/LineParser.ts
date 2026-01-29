import { toTitleCase } from "../constants.js";
import type { ParsedLine } from "../types.js";
import { Eboard } from "./Eboard.js";

export class LineParser {
  constructor(private readonly eboard: Eboard) {}

  /**
   * Parses a single line. Returns null for empty lines or comments.
   */
  parseLine(
    line: string,
    schemaFields: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _lineNumber?: number,
  ): ParsedLine | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@")) {
      return null;
    }

    const indent = (line.match(/^ */)?.[0]?.length ?? 0) / 4;

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

    const eboardVal = parsed.eboard;
    if (typeof eboardVal === "string" && eboardVal.includes("@")) {
      this.eboard.splitEboardString(eboardVal);
    }

    return parsed;
  }

  parseLines(content: string, schema: string): ParsedLine[] {
    const schemaFields = schema.split(",").map((f) => f.trim());
    const lines = content.split(/\r?\n/);
    const out: ParsedLine[] = [];
    for (let i = 0; i < lines.length; i++) {
      const parsed = this.parseLine(lines[i], schemaFields, i + 1);
      if (parsed) out.push(parsed);
    }
    return out;
  }
}
