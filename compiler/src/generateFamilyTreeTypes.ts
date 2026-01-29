import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  InputData,
  jsonInputForTargetLanguage,
  quicktype,
} from "quicktype-core";
import type { FinalCompiledOutput } from "../types.js";

const ROOT_NAME = "DkeNaFamilyTree";
const TYPES_FILENAME = "Quicktype.ts";

export async function writeFamilyTreeTypes(
  data: FinalCompiledOutput,
  outputDir: string,
): Promise<void> {
  const inputData = new InputData();
  const jsonInput = jsonInputForTargetLanguage("typescript");
  await jsonInput.addSource({
    name: ROOT_NAME,
    samples: [JSON.stringify(data)],
  });
  inputData.addInput(jsonInput);

  const result = await quicktype({
    lang: "typescript",
    inputData,
    outputFilename: TYPES_FILENAME,
  });

  let contents = result.lines.join("\n");
  // erasableSyntaxOnly: replace enums with type aliases
  contents = contents.replaceAll(
    /export enum (\w+) \{\s*[\s\S]*?\n\}/g,
    "export type $1 = string;",
  );
  // noUnusedLocals: prefix unused helpers
  contents = contents.replaceAll(/\bfunction u\(/g, "function _u(");
  contents = contents.replaceAll(/\bfunction m\(/g, "function _m(");

  const typesPath = join(outputDir, TYPES_FILENAME);
  writeFileSync(typesPath, contents, "utf-8");
  console.log(`Types: ${typesPath}`);

  const treeTs = `import type { DkeNaFamilyTree } from "./Quicktype.ts";
import jsonTree from "./tree.json";
export * from "./Quicktype.ts";
export const dkeNaFamilyTree = jsonTree as DkeNaFamilyTree;
`;

  writeFileSync(join(outputDir, "tree.ts"), treeTs, "utf-8");
}
