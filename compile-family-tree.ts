import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const inputFilename = "FAMILYTREE.txt";
const outputFilename = "FAMILYTREE.json";

interface Brother {
  name: string;
  class: string;
  children: Brother[];
}

interface Line {
  indent: number;
  name: string;
  class: string;
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

  for (const line of lines) {
    const brother: Brother = {
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

  console.log(`Reading ${inputPath}...`);
  const content = readFileSync(inputPath, "utf-8");
  const lines = content.split("\n");

  console.log("Parsing lines...");
  const parsedLines: Line[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLine(lines[i]);
    if (parsed) {
      parsedLines.push(parsed);
    }
  }

  console.log("Building tree structure...");
  const tree = buildTree(parsedLines);

  console.log("Writing JSON file...");
  const json = JSON.stringify(tree, null, 2);
  writeFileSync(outputPath, json, "utf-8");

  console.log(`✓ Successfully compiled to ${outputPath}`);
  console.log(`  Total brothers: ${countBrothers(tree)}`);
}

function countBrothers(tree: Brother[]): number {
  let count = 0;
  for (const brother of tree) {
    count += 1 + countBrothers(brother.children);
  }
  return count;
}

main();
