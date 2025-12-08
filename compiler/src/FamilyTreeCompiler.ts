import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { FinalCompiledOutput } from "../types.js";
import { VARIABLES } from "../variables.js";
import { ClassExtractor } from "./ClassExtractor.js";
import { ColorCalculator } from "./ColorCalculator.js";
import { FamilyTreeLinter } from "./FamilyTreeLinter.js";
import { LineParser } from "./LineParser.js";
import { TreeBuilder } from "./TreeBuilder.js";
import { VariableParser } from "./VariableParser.js";

export class FamilyTreeCompiler {
  private readonly parser: LineParser;
  private readonly treeBuilder: TreeBuilder;
  private readonly colorCalculator: ColorCalculator;
  private readonly classExtractor: ClassExtractor;
  private readonly linter: FamilyTreeLinter;
  private readonly directiveParser: VariableParser;

  constructor() {
    this.parser = new LineParser();
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
   * Compiles the family tree from input file to output JSON.
   * @throws Error if linting fails
   */
  compile(inputPath: string, outputPath?: string): void {
    console.log(`Reading from ${inputPath}...`);
    const content = readFileSync(inputPath, "utf-8");

    this.precompile(content);

    // Get output filename from VARIABLES (already validated in precompile)
    const outputFilename = VARIABLES.get("output")!;

    // Use provided outputPath or construct from output variable
    // If outputFilename is relative, it's relative to the input file's directory
    // If it's absolute, use it as-is
    const finalOutputPath = outputPath
      ? outputPath
      : outputFilename.startsWith("/")
        ? outputFilename
        : join(dirname(inputPath), outputFilename);

    // Parse lines
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

    // Ensure output directory exists
    const outputDir = dirname(finalOutputPath);
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch {
      // Directory might already exist, ignore
    }

    // Write output
    const json = JSON.stringify(compiledData, null, 2);
    writeFileSync(finalOutputPath, json, "utf-8");

    // Log results
    const totalBrothers = this.treeBuilder.countBrothers(tree);
    console.log(`Successfully compiled to ${finalOutputPath}`);
    console.log(`Total brothers: ${totalBrothers}`);
    console.log(`Available classes: ${availableClasses.length}`);
  }
}
