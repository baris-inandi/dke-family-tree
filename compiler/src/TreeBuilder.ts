import type { Brother, Color, ParsedLine } from "../types.js";

const PLACEHOLDER_COLOR: Color = {
  foreground: "hsl(0 0% 0%)",
  background: "hsla(0 0% 0% / 0)",
};

export class TreeBuilder {
  private idCounter = 0;

  /**
   * Builds a hierarchical tree structure from parsed lines.
   */
  buildTree(lines: ParsedLine[]): Brother[] {
    const root: Brother[] = [];
    const stack: Brother[] = [];
    this.idCounter = 0;

    for (const line of lines) {
      const brother = this.createBrother(line);

      // Find the correct parent based on indent level
      this.adjustStack(stack, line.indent);

      if (stack.length === 0) {
        // Root level
        root.push(brother);
      } else {
        // Add as child of the parent at the top of the stack
        const parent = stack[stack.length - 1];
        parent.children.push(brother);
      }

      stack.push(brother);
    }

    return root;
  }

  /**
   * Creates a Brother object from a parsed line.
   * Colors are assigned later by ColorCalculator.
   */
  private createBrother(line: ParsedLine): Brother {
    const name = (line.name as string) || "";
    const classValue = (line.class as string) || "";

    const info: Record<string, string> = {};
    for (const key in line) {
      if (key !== "indent") {
        info[key] = (line[key] as string) || "";
      }
    }

    return {
      id: `${name}${classValue}${this.idCounter++}`
        .toLowerCase()
        .replace(/ /g, ""),
      info,
      colors: { byFamily: PLACEHOLDER_COLOR, byClass: PLACEHOLDER_COLOR }, // overwritten by ColorCalculator
      children: [],
    };
  }

  /**
   * Adjusts the stack to match the current indent level.
   */
  private adjustStack(stack: Brother[], targetIndent: number): void {
    while (stack.length > 0 && stack[stack.length - 1] !== undefined) {
      const lastIndent = stack.length - 1;
      if (lastIndent >= targetIndent) {
        stack.pop();
      } else {
        break;
      }
    }
  }

  /**
   * Counts the total number of brothers in the tree.
   */
  countBrothers(tree: Brother[]): number {
    let count = 0;
    for (const brother of tree) {
      count += 1 + this.countBrothers(brother.children);
    }
    return count;
  }
}
