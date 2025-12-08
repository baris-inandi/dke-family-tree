export interface LintError {
  line: number;
  message: string;
  content: string;
}

export class FamilyTreeLinter {
  /**
   * Lints the input file content and returns any errors found.
   * Returns empty array if no errors.
   */
  lint(content: string): LintError[] {
    const errors: LintError[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines, comments, and directives
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@")) {
        continue;
      }

      // Check line format
      const formatError = this.validateLineFormat(line, lineNumber);
      if (formatError) {
        errors.push(formatError);
        continue;
      }

      // Check indentation (must be multiple of 4 spaces)
      const indentError = this.validateIndentation(line, lineNumber);
      if (indentError) {
        errors.push(indentError);
      }
    }

    // Check structural consistency
    const structuralErrors = this.validateStructure(lines);
    errors.push(...structuralErrors);

    return errors;
  }

  /**
   * Validates that a line matches the expected format: "Name, Class" or "Name, Class, Grad"
   * Special case: "REDACTED" (no commas) is allowed
   */
  private validateLineFormat(
    line: string,
    lineNumber: number,
  ): LintError | null {
    const trimmed = line.trim();

    // Special case: "REDACTED" is allowed without commas
    if (trimmed === "REDACTED" || trimmed.toUpperCase() === "REDACTED") {
      return null;
    }

    // Must have at least one comma
    if (!trimmed.includes(",")) {
      return {
        line: lineNumber,
        message:
          "Line must contain at least one comma (format: 'Name, Class' or 'Name, Class, Grad')",
        content: trimmed,
      };
    }

    // Parse to check format
    const match = trimmed.match(/^(.+?),\s*(.+?)(?:,\s*(.+))?$/);
    if (!match) {
      return {
        line: lineNumber,
        message:
          "Invalid format. Expected: 'Name, Class' or 'Name, Class, Grad'",
        content: trimmed,
      };
    }

    const name = match[1].trim();
    const className = match[2].trim();

    // Name cannot be empty
    if (!name) {
      return {
        line: lineNumber,
        message: "Name cannot be empty",
        content: trimmed,
      };
    }

    // Class cannot be empty
    if (!className) {
      return {
        line: lineNumber,
        message: "Class cannot be empty",
        content: trimmed,
      };
    }

    return null;
  }

  /**
   * Validates that indentation is consistent (multiples of 4 spaces).
   */
  private validateIndentation(
    line: string,
    lineNumber: number,
  ): LintError | null {
    const leadingSpaces = line.match(/^ */)?.[0]?.length ?? 0;

    // Indentation must be a multiple of 4
    if (leadingSpaces % 4 !== 0) {
      return {
        line: lineNumber,
        message: `Indentation must be a multiple of 4 spaces (found ${leadingSpaces} spaces)`,
        content: line.trim(),
      };
    }

    return null;
  }

  /**
   * Validates structural consistency of the tree.
   */
  private validateStructure(lines: string[]): LintError[] {
    const errors: LintError[] = [];
    const indentStack: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines, comments, and directives
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@")) {
        continue;
      }

      const indent = (line.match(/^ */)?.[0]?.length ?? 0) / 4;

      // Check for invalid indent jumps (can't skip levels)
      if (indentStack.length > 0) {
        const lastIndent = indentStack[indentStack.length - 1];
        if (indent > lastIndent + 1) {
          errors.push({
            line: lineNumber,
            message: `Invalid indent jump: cannot increase indentation by more than 1 level (from level ${lastIndent} to ${indent})`,
            content: trimmed,
          });
        }
      }

      // Update stack
      while (
        indentStack.length > 0 &&
        indentStack[indentStack.length - 1] >= indent
      ) {
        indentStack.pop();
      }
      indentStack.push(indent);
    }

    return errors;
  }

  /**
   * Formats and displays lint errors to the console.
   */
  displayErrors(errors: LintError[]): void {
    if (errors.length === 0) {
      return;
    }

    console.error(`\n❌ Found ${errors.length} error(s) in FAMILYTREE.txt:\n`);

    for (const error of errors) {
      console.error(`  Line ${error.line}: ${error.message}`);
      console.error(`    → ${error.content}`);
      console.error("");
    }

    console.error("Please fix these errors before compilation can proceed.\n");
  }
}
