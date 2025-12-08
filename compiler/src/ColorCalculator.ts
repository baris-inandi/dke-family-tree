import { GREEK_ORDER, toTitleCase } from "../constants.js";
import type { Brother, Color } from "../types.js";

export class ColorCalculator {
  private readonly baseLightness = 25;
  private readonly baseSaturation = 100;

  private readonly huesPerCycle = 12;
  private readonly lightnessStep = 8;
  private readonly saturationStep = 9;

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

    // Now assign colors to each brother's info
    const assignToBrother = (brother: Brother) => {
      const classValue = (brother.info.class as string) || "";
      const normalizedClass = toTitleCase(classValue);
      const byClass = classColors[normalizedClass] || this.createColor(0);
      const byFamily = familyColorMap.get(brother.id) || this.createColor(0);

      brother.info.colors = { byFamily, byClass };
      brother.children.forEach(assignToBrother);
    };

    data.forEach(assignToBrother);
  }

  /**
   * Calculates class colors for all classes.
   */
  calculateClassColors(availableClasses: string[]): Record<string, Color> {
    const classColors: Record<string, Color> = {};
    const orderIndex = new Map<string, number>();
    GREEK_ORDER.forEach((name, idx) => orderIndex.set(name, idx));

    for (const className of availableClasses) {
      // Normalize to Title Case (should already be Title Case, but ensure it)
      const normalized = className ? toTitleCase(className) : "";
      if (!normalized || normalized === "Null" || normalized === "Unknown") {
        continue;
      }

      const colorIndex = this.getClassColorIndex(normalized, orderIndex);
      if (colorIndex !== null) {
        classColors[normalized] = this.createColor(colorIndex);
      }
    }

    return classColors;
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
