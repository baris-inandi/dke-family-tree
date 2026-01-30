import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Brother, FinalCompiledOutput } from "../types.js";
import { ColorCalculator } from "./ColorCalculator.js";
import { Eboard } from "./Eboard.js";
import { LineParser } from "./LineParser.js";
import { TreeBuilder } from "./TreeBuilder.js";
import { writeFamilyTreeTypes } from "./generateFamilyTreeTypes.js";

function semesterKey(s: string): [number, number] {
  const [season, yearStr] = s.split(" ");
  const year = Number.parseInt(yearStr, 10) || 0;
  const order = season === "Fall" ? 1 : 0;
  return [year, order];
}

function sortSemestersChronological(semesters: string[]): string[] {
  return [...semesters].sort((a, b) => {
    const [yA, oA] = semesterKey(a);
    const [yB, oB] = semesterKey(b);
    return yA !== yB ? yA - yB : oA - oB;
  });
}

/** Newest first (reverse chronological) for UI dropdowns and tree.json order */
function sortSemestersReverseChronological(semesters: string[]): string[] {
  return sortSemestersChronological(semesters).reverse();
}

function buildEboardMetadata(tree: Brother[]): {
  bySemester: Record<string, Record<string, string>>;
  byPosition: Record<string, Record<string, string>>;
  mostRecentSemester: string;
} {
  /** semester → { position → id } */
  const bySemester: Record<string, Record<string, string>> = {};
  /** position → { semester → id } (we'll sort semester keys per position at the end) */
  const byPositionRaw: Record<string, Record<string, string>> = {};

  function walk(brothers: Brother[]) {
    for (const b of brothers) {
      const history = b.info.eboard ?? [];
      for (const pos of history) {
        (bySemester[pos.semester] ??= {})[pos.positionName] = b.id;
        (byPositionRaw[pos.positionName] ??= {})[pos.semester] = b.id;
      }
      walk(b.children);
    }
  }
  walk(tree);

  const byPosition: Record<string, Record<string, string>> = {};
  for (const [position, semesterToId] of Object.entries(byPositionRaw)) {
    const sorted = sortSemestersReverseChronological(Object.keys(semesterToId));
    byPosition[position] = {};
    for (const s of sorted) byPosition[position][s] = semesterToId[s];
  }

  let mostRecentSemester = "";
  let max: [number, number] = [-1, -1];
  for (const s of Object.keys(bySemester)) {
    const [y, o] = semesterKey(s);
    if (y > max[0] || (y === max[0] && o > max[1])) {
      max = [y, o];
      mostRecentSemester = s;
    }
  }

  const sortedSemesterKeys = sortSemestersReverseChronological(
    Object.keys(bySemester),
  );
  const bySemesterSorted: Record<string, Record<string, string>> = {};
  for (const s of sortedSemesterKeys) bySemesterSorted[s] = bySemester[s];

  return {
    bySemester: bySemesterSorted,
    byPosition,
    mostRecentSemester,
  };
}

const OUTPUT_DIR = "familytree-output";

function getSchema(content: string): string {
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (t.startsWith("@SCHEMA")) {
      const value = t.slice(7).trim();
      if (value) return value;
      break;
    }
  }
  throw new Error(
    "Missing @SCHEMA. Add a line like: @SCHEMA name, class, eboard",
  );
}

interface LintError {
  line: number;
  message: string;
  content: string;
}

function lintLine(line: string, n: number): LintError[] {
  const t = line.trim();
  const errors: LintError[] = [];
  const spaces = line.match(/^ */)?.[0]?.length ?? 0;
  if (spaces % 4 !== 0) {
    errors.push({
      line: n,
      message: `Indentation must be a multiple of 4 spaces (found ${spaces})`,
      content: t,
    });
    return errors;
  }
  if (t === "REDACTED" || t.toUpperCase() === "REDACTED") return errors;
  if (!t.includes(",")) {
    errors.push({
      line: n,
      message: "Line must contain at least one comma (Name, Class)",
      content: t,
    });
    return errors;
  }
  const [name, cls] = t.split(",").map((s) => s.trim());
  if (!name)
    errors.push({ line: n, message: "Name cannot be empty", content: t });
  if (!cls)
    errors.push({ line: n, message: "Class cannot be empty", content: t });
  return errors;
}

function lintStructure(lines: string[]): LintError[] {
  const errors: LintError[] = [];
  const stack: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith("#") || t.startsWith("@")) continue;
    const indent = (lines[i].match(/^ */)?.[0]?.length ?? 0) / 4;
    const last = stack[stack.length - 1];
    if (stack.length > 0 && indent > last + 1) {
      errors.push({
        line: i + 1,
        message: `Invalid indent jump (from ${last} to ${indent})`,
        content: t,
      });
    }
    while (stack.length > 0 && stack[stack.length - 1] >= indent) stack.pop();
    stack.push(indent);
  }
  return errors;
}

function lint(content: string): LintError[] {
  const lines = content.split("\n");
  const errors: LintError[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith("#") || t.startsWith("@")) continue;
    errors.push(...lintLine(lines[i], i + 1));
  }
  errors.push(...lintStructure(lines));
  return errors;
}

function displayLintErrors(errors: LintError[]): void {
  if (errors.length === 0) return;
  console.error(`\n❌ Found ${errors.length} error(s):\n`);
  for (const e of errors) {
    console.error(`  Line ${e.line}: ${e.message}`);
    console.error(`    → ${e.content}\n`);
  }
  process.exit(1);
}

export class FamilyTreeCompiler {
  private readonly parser = new LineParser(new Eboard());
  private readonly treeBuilder = new TreeBuilder();
  private readonly colorCalculator = new ColorCalculator();

  async compile(inputPath: string): Promise<void> {
    console.log(`Reading from ${inputPath}...`);
    const content = readFileSync(inputPath, "utf-8");

    const schema = getSchema(content);
    console.log("Linting...");
    const lintErrors = lint(content);
    if (lintErrors.length > 0) displayLintErrors(lintErrors);

    const cwd = process.cwd();
    const outputDir = join(cwd, OUTPUT_DIR);
    const jsonPath = join(outputDir, "tree.json");

    const parsedLines = this.parser.parseLines(content, schema);
    const tree = this.treeBuilder.buildTree(parsedLines);

    const { classColors, allClasses } =
      this.colorCalculator.calculateClassColors(tree);
    this.colorCalculator.assignColorsToBrothers(tree, classColors);

    const eboardMeta = buildEboardMetadata(tree);

    const compiled: FinalCompiledOutput = {
      metadata: {
        allClasses,
        eboard: {
          bySemester: eboardMeta.bySemester,
          byPosition: eboardMeta.byPosition,
        },
        mostRecentSemester: eboardMeta.mostRecentSemester,
      },
      tree,
    };

    mkdirSync(outputDir, { recursive: true });
    writeFileSync(jsonPath, JSON.stringify(compiled, null, 2), "utf-8");

    const total = this.treeBuilder.countBrothers(tree);
    console.log(`Successfully compiled to ${jsonPath}`);
    console.log(`Total brothers: ${total}`);
    console.log(`Available classes: ${allClasses.length}`);

    await writeFamilyTreeTypes(compiled, outputDir);
  }
}
