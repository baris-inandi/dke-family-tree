/** Valid semester codes: F = Fall, S = Spring */
const VALID_SEMESTERS = ["F", "S"] as const;
export type Semester = (typeof VALID_SEMESTERS)[number];

export interface EboardEntry {
  position: string;
  positionName: string;
  semester: Semester;
  year: string;
}

export class Eboard {
  private readonly expansion: Record<string, string> = {
    B: "President",
    S: "Vice President",
    M: "VP Health & Safety",
    K: "Treasurer",
    A: "Rush Chair",
    P: "Master of Ceremonies",
    D: "Social Chair",
    G: "Philanthropy Chair",
    I: "Secretary",
  };

  private readonly validPositions = new Set(Object.keys(this.expansion));

  /** Regex for a single eboard field on a brother line: POSITION:SEMESTER-YEAR (e.g. G:S-2026) */
  static readonly EBOARD_FIELD_REGEX = /^[A-Za-z]:[FS](-?\d*)$/i;

  /**
   * Validates a single eboard field (e.g. G:S-2026). Exits with code 1 if position is not defined or semester is not F or S.
   */
  validateEboardField(field: string, lineNumber?: number): void {
    const loc = lineNumber == null ? "" : ` (line ${lineNumber})`;
    const colonIndex = field.indexOf(":");
    if (colonIndex === -1) {
      console.error(
        `Eboard error${loc}: expected format POSITION:SEMESTER-YEAR (e.g. G:S-2026), got "${field}"`,
      );
      process.exit(1);
    }
    const position = field.slice(0, colonIndex).trim();
    const semesterPart = field.slice(colonIndex + 1).trim();
    if (!this.validPositions.has(position)) {
      console.error(
        `Eboard error${loc}: unknown position "${position}". Valid positions: ${[...this.validPositions].sort().join(", ")}`,
      );
      process.exit(1);
    }
    const semesterChar = semesterPart.charAt(0).toUpperCase();
    if (!VALID_SEMESTERS.includes(semesterChar as Semester)) {
      console.error(
        `Eboard error${loc}: semester must be F (Fall) or S (Spring), got "${semesterChar}" in "${semesterPart}"`,
      );
      process.exit(1);
    }
  }

  /**
   * Parses eboard string (one line per entry: POSITION:SEMESTER-YEAR, e.g. S:F-2026).
   * Exits the process with code 1 if any position is not defined or semester is not F or S.
   */
  parseEboardString(eboardString: string): EboardEntry[] {
    const lines = eboardString
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const entries: EboardEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) {
        console.error(
          `Eboard error (line ${i + 1}): expected format POSITION:SEMESTER-YEAR (e.g. S:F-2026), got "${line}"`,
        );
        process.exit(1);
      }

      const position = line.slice(0, colonIndex).trim();
      const semesterPart = line.slice(colonIndex + 1).trim();

      if (!this.validPositions.has(position)) {
        console.error(
          `Eboard error (line ${i + 1}): unknown position "${position}". Valid positions: ${[...this.validPositions].sort().join(", ")}`,
        );
        process.exit(1);
      }

      const semesterChar = semesterPart.charAt(0).toUpperCase();
      if (!VALID_SEMESTERS.includes(semesterChar as Semester)) {
        console.error(
          `Eboard error (line ${i + 1}): semester must be F (Fall) or S (Spring), got "${semesterChar}" in "${semesterPart}"`,
        );
        process.exit(1);
      }

      const year = semesterPart.slice(1).replace(/^-/, "").trim();
      entries.push({
        position,
        positionName: this.expansion[position],
        semester: semesterChar as Semester,
        year: year || "",
      });
    }

    return entries;
  }
}
