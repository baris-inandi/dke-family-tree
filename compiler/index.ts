import { join } from "path";
import { FamilyTreeCompiler } from "./src/FamilyTreeCompiler.js";

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Error: Input file path required as first argument");
    console.error("Usage: bun ./compiler/index.ts <input-file>");
    process.exit(1);
  }

  const cwd = process.cwd();
  const absoluteInputPath = join(cwd, inputPath);

  const compiler = new FamilyTreeCompiler();
  await compiler.compile(absoluteInputPath);
}

main();
