import { GREEK_ORDER, toTitleCase } from "../constants.js";
import type { Brother, Color } from "../types.js";

export class ColorCalculator {
  private readonly baseLightness = 25;
  private readonly baseSaturation = 100;

  private readonly huesPerCycle = 12;
  private readonly lightnessStep = 12;
  private readonly saturationStep = 25;

  private readonly lowkeyOpacity = 0.15;

  /**
   * Generates a sequential color based on an index.
   */
  getSequentialColor(index: number): string {
    const i = Math.max(0, Math.floor(index));
    const hueStep = 360 / this.huesPerCycle;
    const hueIndex = i % this.huesPerCycle;
    const lightnessIndex = Math.floor(i / this.huesPerCycle);

    const hue = (hueIndex * hueStep) % 360;
    const lightness = Math.min(
      100,
      this.baseLightness + lightnessIndex * this.lightnessStep,
    );
    const saturation = Math.max(
      0,
      this.baseSaturation - lightnessIndex * this.saturationStep,
    );

    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }

  /**
   * Creates a low-key background color from a foreground HSL string.
   */
  lowkeyColor(hslString: string): string {
    const match = hslString.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
    if (!match) {
      throw new Error(`Invalid HSL string: ${hslString}`);
    }

    const hue = match[1];
    const saturation = Number(match[2]) + 10;
    const lightness = Number(match[3]) + 10;

    return `hsla(${hue} ${saturation}% ${lightness}% / ${this.lowkeyOpacity})`;
  }

  /**
   * Creates a Color object with foreground and background.
   */
  createColor(index: number): Color {
    const foreground = this.getSequentialColor(index);
    const background = this.lowkeyColor(foreground);
    return { foreground, background };
  }

  /**
   * Assigns colors directly to each brother's info.colors object.
   */
  assignColorsToBrothers(
    data: Brother[],
    classColors: Record<string, Color>,
  ): void {
    // First, calculate family colors by traversing the tree
    const familyColorMap = new Map<string, Color>();

    const assignFamilyColor = (brother: Brother, colorIndex: number) => {
      const color = this.createColor(colorIndex);
      familyColorMap.set(brother.id, color);
      brother.children.forEach((child) => assignFamilyColor(child, colorIndex));
    };

    if (data.length === 1) {
      // Single root: each immediate child is a family
      const root = data[0];
      root.children.forEach((familyRoot, index) => {
        assignFamilyColor(familyRoot, index);
      });
    } else {
      // Multiple roots: each root is a family
      data.forEach((root, index) => {
        assignFamilyColor(root, index);
      });
    }

    // Gray color for redacted entries in class mode
    const redactedGrayColor: Color = {
      foreground: "hsl(0 0% 50%)",
      background: "hsla(0 0% 60% / 0.15)",
    };

    const assignToBrother = (brother: Brother) => {
      const classValue = (brother.info.class as string) || "";

      const byClass =
        classValue === "[REDACTED]" || classValue === "[Redacted]"
          ? redactedGrayColor
          : (() => {
              const normalizedClass = toTitleCase(classValue);
              return classColors[normalizedClass] || this.createColor(0);
            })();
      const byFamily = familyColorMap.get(brother.id) || this.createColor(0);

      brother.colors = { byFamily, byClass };
      brother.children.forEach(assignToBrother);
    };

    data.forEach(assignToBrother);
  }

  /**
   * Extracts unique class names from the tree (Title Case, excludes Unknown/redacted).
   */
  extractClasses(data: Brother[]): string[] {
    const set = new Set<string>();
    const collect = (brothers: Brother[]) => {
      for (const b of brothers) {
        let v = b.info.class;
        if (typeof v === "string" && v !== "[REDACTED]") v = toTitleCase(v);
        if (
          typeof v === "string" &&
          v !== "Unknown" &&
          v !== "All Classes" &&
          v !== "[REDACTED]"
        )
          set.add(v);
        if (b.children?.length) collect(b.children);
      }
    };
    collect(data);
    const orderIndex = new Map<string, number>();
    GREEK_ORDER.forEach((name, idx) => orderIndex.set(name, idx));
    return Array.from(set).sort((a, b) => {
      const ai = orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER;
      return ai !== bi ? ai - bi : a.localeCompare(b);
    });
  }

  /**
   * Calculates class colors and returns them plus the list of class names (for metadata).
   */
  calculateClassColors(data: Brother[]): {
    classColors: Record<string, Color>;
    allClasses: string[];
  } {
    const allClasses = this.extractClasses(data);
    const classColors: Record<string, Color> = {};
    const orderIndex = new Map<string, number>();
    GREEK_ORDER.forEach((name, idx) => orderIndex.set(name, idx));

    for (const className of allClasses) {
      const normalized = className ? toTitleCase(className) : "";
      if (!normalized || normalized === "Null" || normalized === "Unknown")
        continue;
      const colorIndex = this.getClassColorIndex(normalized, orderIndex);
      if (colorIndex !== null)
        classColors[normalized] = this.createColor(colorIndex);
    }
    return { classColors, allClasses };
  }

  /**
   * Calculates the color index for a given class name.
   */
  private getClassColorIndex(
    className: string,
    orderIndex: Map<string, number>,
  ): number | null {
    // Normalize to Title Case for matching (GREEK_ORDER is now Title Case)
    const normalized = toTitleCase(className.trim());
    const parts = normalized.split(/\s+/);
    const base = parts[0];
    const baseIndex = orderIndex.get(base);

    if (baseIndex === undefined) {
      return null;
    }

    if (parts.length === 1) {
      // Simple class
      return baseIndex;
    }

    // Extended class like "Alpha Alpha"
    const ext = parts[1];
    const extIndex = orderIndex.get(ext) ?? 0;
    const offset = GREEK_ORDER.length;
    return offset + baseIndex * GREEK_ORDER.length + extIndex;
  }
}
