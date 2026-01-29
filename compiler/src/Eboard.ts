const VALID_SEMESTERS = ["F", "S"] as const;
export type Semester = (typeof VALID_SEMESTERS)[number];

export type BrotherEboardHistory = Array<EboardPosition>;

export interface EboardPosition {
  positionName: string;
  semester: string;
}

export class Eboard {
  private readonly expansion: Record<string, string> = {
    PRES: "President",
    VICE: "Vice President",
    VPHS: "VP Health & Safety",
    TRES: "Treasurer",
    MSTR: "Master of Ceremonies",
    RUSH: "Rush Chair",
    SOCL: "Social Chair",
    PHIL: "Philanthropy Chair",
    SECR: "Secretary",
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
      const delim = position.indexOf("@");
      if (delim === -1) {
        throw new Error(
          `Eboard: expected POSITION@SEMESTERYEAR (e.g. PHIL@S2026), got "${position}"`,
        );
      }
      const positionCode = position.slice(0, delim).trim().toUpperCase();
      const semesterAndYear = position.slice(delim + 1).trim();
      if (/[FS]\s*-\s*\d/.test(semesterAndYear)) {
        throw new Error(
          `Eboard: use SEMESTERYEAR format (e.g. S2026), got "${semesterAndYear}"`,
        );
      }
      const semesterChar = semesterAndYear.charAt(0).toUpperCase();
      const yearStr = semesterAndYear.slice(1).trim();

      if (!VALID_SEMESTERS.includes(semesterChar as Semester)) {
        throw new Error(
          `Eboard: semester must be F or S, got "${semesterChar}"`,
        );
      }
      if (!/^\d+$/.test(yearStr)) {
        throw new Error(
          `Eboard: year must be digits only after F/S (e.g. S2026), got "${semesterAndYear}"`,
        );
      }
      if (!this.allEboardPositions.has(positionCode)) {
        throw new Error(
          `Eboard: unknown position "${positionCode}". Valid: ${[...this.allEboardPositions].sort().join(", ")}`,
        );
      }

      const year = Number.parseInt(yearStr, 10);
      if (Number.isNaN(year)) {
        throw new TypeError(`Eboard: invalid year "${yearStr}"`);
      }

      return {
        positionName: this.expansion[positionCode],
        semester: `${(semesterChar as Semester) === "F" ? "Fall" : "Spring"} ${year}`,
      };
    });
  }
}
