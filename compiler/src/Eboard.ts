const VALID_SEMESTERS = ["F", "S"] as const;
export type Semester = (typeof VALID_SEMESTERS)[number];

export type BrotherEboardHistory = Array<EboardPosition>;

export interface EboardPosition {
  positionName: string;
  semester: "Fall" | "Spring";
  year: number;
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

  private readonly allEboardPositions = new Set(Object.keys(this.expansion));

  splitEboardString(eboardString: string): BrotherEboardHistory {
    const raw = eboardString.trim();
    if (!raw) return [];

    const positions = raw
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean);
    return positions.map((position) => {
      const colon = position.indexOf(":");
      if (colon === -1) {
        throw new Error(
          `Eboard: expected POSITION:SEMESTER-YEAR (e.g. G:S-2026), got "${position}"`,
        );
      }
      const positionCode = position.slice(0, colon).trim();
      const semesterAndYear = position.slice(colon + 1).trim();
      const semesterChar = semesterAndYear.charAt(0).toUpperCase();
      const yearStr = semesterAndYear.slice(1).replace(/^-/, "").trim();

      if (!VALID_SEMESTERS.includes(semesterChar as Semester)) {
        throw new Error(
          `Eboard: semester must be F or S, got "${semesterChar}"`,
        );
      }
      if (!this.allEboardPositions.has(positionCode)) {
        throw new Error(
          `Eboard: unknown position "${positionCode}". Valid: ${[...this.allEboardPositions].sort().join(", ")}`,
        );
      }

      const year = yearStr ? Number.parseInt(yearStr, 10) : 0;
      if (yearStr && Number.isNaN(year)) {
        throw new Error(`Eboard: invalid year "${yearStr}"`);
      }

      return {
        positionName: this.expansion[positionCode],
        semester: (semesterChar as Semester) === "F" ? "Fall" : "Spring",
        year,
      };
    });
  }
}
