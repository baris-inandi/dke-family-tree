import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const inputFilename = "./FAMILYTREE.txt";
const outputFilename = "./tree/tree.json";

interface Brother {
  id: string;
  name: string;
  class: string;
  children: Brother[];
}

interface Line {
  indent: number;
  name: string;
  class: string;
}

interface Color {
  foreground: string;
  background: string;
}

interface CompiledData {
  tree: Brother[];
  metadata: {
    availableClasses: string[];
    classColors: Record<string, Color>;
    familyColors: Record<string, Color>; // brother id -> Color
  };
}

// Greek alphabet order for sorting classes
const GREEK_ORDER = [
  "Alpha",
  "Beta",
  "Gamma",
  "Delta",
  "Epsilon",
  "Zeta",
  "Eta",
  "Theta",
  "Iota",
  "Kappa",
  "Lambda",
  "Mu",
  "Nu",
  "Xi",
  "Omicron",
  "Pi",
  "Rho",
  "Sigma",
  "Tau",
  "Upsilon",
  "Phi",
  "Chi",
  "Psi",
  "Omega",
] as const;

function getSequentialColor(index: number): string {
  const i = Math.max(0, Math.floor(index));
  const cycleSize = 12;
  const hueStep = 360 / cycleSize;
  const hueIndex = i % cycleSize;
  const lightnessIndex = Math.floor(i / cycleSize);
  const hue = (hueIndex * hueStep) % 360;
  const baseLightness = 25;
  const baseSaturation = 100;
  const lightness = Math.min(100, baseLightness + lightnessIndex * 7);
  const saturation = Math.max(0, baseSaturation - lightnessIndex * 9);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function lowkeyColor(hslString: string, opacity: number): string {
  const match = hslString.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
  if (!match) {
    throw new Error(`Invalid HSL string: ${hslString}`);
  }
  const hue = match[1];
  const saturation = Number(match[2]) + 10;
  const lightness = Number(match[3]) + 10;
  return `hsla(${hue} ${saturation}% ${lightness}% / ${opacity})`;
}

// Create a Color object with foreground and background
function createColor(index: number): Color {
  const foreground = getSequentialColor(index);
  const background = lowkeyColor(foreground, 0.2);
  return { foreground, background };
}

// Calculate family colors - map each brother to their family color
function calculateFamilyColors(data: Brother[]): Record<string, Color> {
  const familyColors: Record<string, Color> = {};

  function assignFamilyColor(brother: Brother, colorIndex: number) {
    const color = createColor(colorIndex);
    familyColors[brother.id] = color;
    brother.children.forEach((child) => assignFamilyColor(child, colorIndex));
  }

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

  return familyColors;
}

// Calculate class colors for all classes
function calculateClassColors(
  availableClasses: string[]
): Record<string, Color> {
  const classColors: Record<string, Color> = {};
  const orderIndex = new Map<string, number>();
  GREEK_ORDER.forEach((name, idx) => orderIndex.set(name, idx));

  for (const className of availableClasses) {
    if (!className || className === "null" || className === "unknown") {
      continue;
    }

    const parts = className.trim().split(/\s+/);
    const base = parts[0];
    const baseIndex = orderIndex.get(base);

    if (baseIndex === undefined) {
      continue;
    }

    let colorIndex: number;
    if (parts.length === 1) {
      // Simple class
      colorIndex = baseIndex;
    } else {
      // Extended class like "Alpha Alpha"
      const ext = parts[1];
      const extIndex = orderIndex.get(ext) ?? 0;
      const offset = GREEK_ORDER.length;
      colorIndex = offset + baseIndex * GREEK_ORDER.length + extIndex;
    }

    classColors[className] = createColor(colorIndex);
  }

  return classColors;
}

// Extract and sort available classes
function extractAvailableClasses(data: Brother[]): string[] {
  const classes = new Set<string>();

  function collect(brothers: Brother[]) {
    for (const b of brothers) {
      if (
        b.class &&
        b.class !== "null" &&
        b.class !== "unknown" &&
        b.class !== "All Classes"
      ) {
        classes.add(b.class);
      }
      if (b.children && b.children.length > 0) {
        collect(b.children);
      }
    }
  }

  collect(data);

  const orderIndex = new Map<string, number>();
  GREEK_ORDER.forEach((name, idx) => orderIndex.set(name, idx));

  return Array.from(classes).sort((a, b) => {
    const ai = orderIndex.has(a) ? orderIndex.get(a)! : Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.has(b) ? orderIndex.get(b)! : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });
}

function parseLine(line: string): Line | null {
  // Skip empty lines and comments
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  // Count leading spaces (4 spaces = 1 indent level)
  const indent = (line.match(/^ */)?.[0]?.length ?? 0) / 4;

  // Parse "Name, Class" format
  const match = trimmed.match(/^(.+?),\s*(.+)$/);
  if (!match) {
    throw new Error(`Invalid line format: ${line}`);
  }

  return {
    indent,
    name: match[1].trim(),
    class: match[2].trim(),
  };
}

function buildTree(lines: Line[]): Brother[] {
  const root: Brother[] = [];
  const stack: Brother[] = [];
  let idCounter = 0;

  for (const line of lines) {
    const brother: Brother = {
      id: `${line.name}${line.class}${idCounter++}`
        .toLowerCase()
        .replace(/ /g, ""),
      name: line.name,
      class: line.class,
      children: [],
    };

    // Find the correct parent based on indent level
    while (stack.length > 0 && stack[stack.length - 1] !== undefined) {
      const lastIndent = stack.length - 1;
      if (lastIndent >= line.indent) {
        stack.pop();
      } else {
        break;
      }
    }

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

function main() {
  const cwd = process.cwd();
  const inputPath = join(cwd, inputFilename);
  const outputPath = join(cwd, outputFilename);

  console.log(`Reading from ${inputPath}...`);
  const content = readFileSync(inputPath, "utf-8");
  const lines = content.split("\n");

  const parsedLines: Line[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLine(lines[i]);
    if (parsed) {
      parsedLines.push(parsed);
    }
  }

  const tree = buildTree(parsedLines);

  // Pre-compute metadata
  const availableClasses = extractAvailableClasses(tree);
  const familyColors = calculateFamilyColors(tree);
  const classColors = calculateClassColors(availableClasses);

  const compiledData: CompiledData = {
    metadata: {
      availableClasses,
      classColors,
      familyColors,
    },
    tree,
  };

  const json = JSON.stringify(compiledData, null, 2);
  writeFileSync(outputPath, json, "utf-8");

  console.log(`Successfully compiled to ${outputPath}`);
  console.log(`Total brothers: ${countBrothers(tree)}`);
  console.log(`Available classes: ${availableClasses.length}`);
  console.log(`Class colors: ${Object.keys(classColors).length}`);
  console.log(`Family colors: ${Object.keys(familyColors).length} entries`);
}

function countBrothers(tree: Brother[]): number {
  let count = 0;
  for (const brother of tree) {
    count += 1 + countBrothers(brother.children);
  }
  return count;
}

main();
