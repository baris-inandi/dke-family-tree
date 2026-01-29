import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { FinalCompiledOutput } from "../types.js";
import { ClassExtractor } from "./ClassExtractor.js";
import { ColorCalculator } from "./ColorCalculator.js";
import { Eboard } from "./Eboard.js";
import { FamilyTreeLinter } from "./FamilyTreeLinter.js";
import { LineParser } from "./LineParser.js";
import { TreeBuilder } from "./TreeBuilder.js";
import { VariableParser } from "./VariableParser.js";
import { writeFamilyTreeTypes } from "./generateFamilyTreeTypes.js";

const OUTPUT_DIR = "familytree-output";

export class FamilyTreeCompiler {
  private readonly parser: LineParser;
  private readonly treeBuilder: TreeBuilder;
  private readonly colorCalculator: ColorCalculator;
  private readonly classExtractor: ClassExtractor;
  private readonly linter: FamilyTreeLinter;
  private readonly directiveParser: VariableParser;
  private readonly eboard: Eboard;

  constructor() {
    this.eboard = new Eboard();
    this.parser = new LineParser(this.eboard);
    this.treeBuilder = new TreeBuilder();
    this.colorCalculator = new ColorCalculator();
    this.classExtractor = new ClassExtractor();
    this.linter = new FamilyTreeLinter();
    this.directiveParser = new VariableParser();
  }

  private precompile(content: string): void {
    // Parse and store variables
    this.directiveParser.parseDirectives(content);

    // Lint the file
    console.log("Linting file...");
    const lintErrors = this.linter.lint(content);
    if (lintErrors.length > 0) {
      this.linter.displayErrors(lintErrors);
      process.exit(1);
    }
    console.log("Linter passed\n");
  }

  /**
   * Compiles the family tree from input file to ./familytree-output/tree.json
   * and generates types to ./familytree-output/FamilyTree.ts.
   */
  async compile(inputPath: string): Promise<void> {
    console.log(`Reading from ${inputPath}...`);
    const content = readFileSync(inputPath, "utf-8");

    this.precompile(content);

    const cwd = process.cwd();
    const outputDir = join(cwd, OUTPUT_DIR);
    const finalOutputPath = join(outputDir, "tree.json");

    // Parse lines (eboard fields like G:S-2026 are validated and stored per brother)
    const parsedLines = this.parser.parseLines(content);

    // Build tree structure
    const tree = this.treeBuilder.buildTree(parsedLines);

    // Pre-compute metadata
    const availableClasses = this.classExtractor.extractAvailableClasses(tree);
    const classColors =
      this.colorCalculator.calculateClassColors(availableClasses);

    // Assign colors directly to each brother
    this.colorCalculator.assignColorsToBrothers(tree, classColors);

    // Create compiled data structure
    const compiledData: FinalCompiledOutput = {
      metadata: {
        allClasses: availableClasses,
      },
      tree,
    };

    try {
      mkdirSync(outputDir, { recursive: true });
    } catch {
      // ignore
    }

    const json = JSON.stringify(compiledData, null, 2);
    writeFileSync(finalOutputPath, json, "utf-8");

    const totalBrothers = this.treeBuilder.countBrothers(tree);
    console.log(`Successfully compiled to ${finalOutputPath}`);
    console.log(`Total brothers: ${totalBrothers}`);
    console.log(`Available classes: ${availableClasses.length}`);

    await writeFamilyTreeTypes(compiledData, outputDir);
  }
}
