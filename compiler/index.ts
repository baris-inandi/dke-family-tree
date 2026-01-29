import { join } from "node:path";
import { FamilyTreeCompiler } from "./src/FamilyTreeCompiler.js";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: bun ./compiler/index.ts <input-file>");
  process.exit(1);
}

const compiler = new FamilyTreeCompiler();
await compiler.compile(join(process.cwd(), inputPath));
