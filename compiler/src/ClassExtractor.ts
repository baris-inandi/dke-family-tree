import { GREEK_ORDER, toTitleCase } from "../constants.js";
import type { Brother } from "../types.js";

export class ClassExtractor {
  /**
   * Extracts and sorts all available classes from the tree.
   */
  extractAvailableClasses(data: Brother[]): string[] {
    const classes = new Set<string>();

    const collect = (brothers: Brother[]) => {
      for (const b of brothers) {
        let classValue = b.info.class;
        // Normalize to Title Case (should already be Title Case from parser, but ensure it)
        if (typeof classValue === "string" && classValue !== "[REDACTED]") {
          classValue = toTitleCase(classValue);
        }
        if (
          typeof classValue === "string" &&
          classValue !== "Null" &&
          classValue !== "Unknown" &&
          classValue !== "All Classes" &&
          classValue !== "[REDACTED]"
        ) {
          classes.add(classValue);
        }
        if (b.children && b.children.length > 0) {
          collect(b.children);
        }
      }
    };

    collect(data);

    const orderIndex = new Map<string, number>();
    GREEK_ORDER.forEach((name, idx) => orderIndex.set(name, idx));

    return Array.from(classes).sort((a, b) => {
      const ai = orderIndex.has(a)
        ? orderIndex.get(a)!
        : Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.has(b)
        ? orderIndex.get(b)!
        : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return a.localeCompare(b);
    });
  }
}
